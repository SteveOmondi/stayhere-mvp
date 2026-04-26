using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.AiAgent.Models;
using StayHere.Application.Common.Interfaces;
using System.Text.RegularExpressions;

namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// Text-chunk knowledge base (same approach as PropPulse). Replace with pgvector-backed search when ready.
/// </summary>
public class AgentKnowledgeBaseRepository : IAgentKnowledgeBaseRepository
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AgentKnowledgeBaseRepository> _logger;
    private List<KbDocument> _documents = new();
    private bool _loaded;
    private readonly object _sync = new();

    public AgentKnowledgeBaseRepository(IConfiguration configuration, ILogger<AgentKnowledgeBaseRepository> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AgentKnowledgeSearchResult>> SearchAsync(
        string query,
        int topK = 5,
        CancellationToken cancellationToken = default)
    {
        if (!_loaded)
            await LoadDocumentsAsync(cancellationToken);

        var queryWords = Regex.Matches(query.ToLowerInvariant(), @"\b\w+\b")
            .Select(m => m.Value)
            .ToHashSet();

        var results = new List<AgentKnowledgeSearchResult>();

        foreach (var doc in _documents)
        {
            var contentWords = Regex.Matches(doc.Content.ToLowerInvariant(), @"\b\w+\b")
                .Select(m => m.Value)
                .ToHashSet();

            var intersection = queryWords.Intersect(contentWords).Count();
            if (intersection <= 0) continue;

            var union = queryWords.Union(contentWords).Count();
            var similarity = union > 0 ? (double)intersection / union : 0;

            if (similarity > 0.1)
            {
                results.Add(new AgentKnowledgeSearchResult
                {
                    Content = doc.Content,
                    Source = doc.Source,
                    Score = similarity,
                    Metadata = new Dictionary<string, object>
                    {
                        ["file_type"] = doc.Metadata.FileType,
                        ["file_size"] = doc.Metadata.FileSize,
                        ["modified"] = doc.Metadata.Modified
                    }
                });
            }
        }

        return results
            .OrderByDescending(r => r.Score)
            .Take(topK)
            .ToList();
    }

    public async Task<IReadOnlyDictionary<string, object>> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        if (!_loaded)
            await LoadDocumentsAsync(cancellationToken);

        var documentsInfo = _documents
            .GroupBy(d => d.Source)
            .Select(g => (object)new Dictionary<string, object?>
            {
                ["filename"] = g.Key,
                ["file_type"] = g.First().Metadata.FileType,
                ["size"] = g.First().Metadata.FileSize,
                ["last_modified"] = g.First().Metadata.Modified,
                ["chunks"] = g.Count()
            })
            .ToList();

        return new Dictionary<string, object>
        {
            ["total_documents"] = _documents.GroupBy(d => d.Source).Count(),
            ["total_chunks"] = _documents.Count,
            ["last_updated"] = DateTime.UtcNow,
            ["loaded"] = _loaded,
            ["documents"] = documentsInfo
        };
    }

    private async Task LoadDocumentsAsync(CancellationToken cancellationToken)
    {
        if (_loaded)
            return;

        lock (_sync)
        {
            if (_loaded)
                return;

            var knowledgeBasePath = _configuration["KnowledgeBasePath"] ?? "./knowledgebase";
            var supportedTypes = new[] { ".txt" };

            _logger.LogInformation("Loading knowledge base from {Path}", knowledgeBasePath);

            if (!Directory.Exists(knowledgeBasePath))
            {
                _logger.LogWarning("Knowledge base path not found: {Path}", knowledgeBasePath);
                _loaded = true;
                return;
            }

            var documents = new List<KbDocument>();

            foreach (var filePath in Directory.GetFiles(knowledgeBasePath, "*.*", SearchOption.AllDirectories))
            {
                cancellationToken.ThrowIfCancellationRequested();
                var extension = Path.GetExtension(filePath).ToLowerInvariant();
                if (!supportedTypes.Contains(extension))
                    continue;

                try
                {
                    var content = File.ReadAllText(filePath);
                    var chunks = SplitText(content);

                    for (var i = 0; i < chunks.Count; i++)
                    {
                        documents.Add(new KbDocument
                        {
                            Content = chunks[i],
                            Source = Path.GetFileName(filePath),
                            Metadata = new KbMetadata
                            {
                                FileType = extension,
                                FileSize = new FileInfo(filePath).Length,
                                Modified = File.GetLastWriteTimeUtc(filePath)
                            }
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error loading file {FilePath}", filePath);
                }
            }

            _documents = documents;
            _loaded = true;
            _logger.LogInformation(
                "Knowledge base loaded: {Files} files, {Chunks} chunks",
                documents.GroupBy(d => d.Source).Count(),
                documents.Count);
        }

        await Task.CompletedTask;
    }

    private static List<string> SplitText(string text, int chunkSize = 1000, int overlap = 200)
    {
        if (text.Length <= chunkSize)
            return new List<string> { text };

        var chunks = new List<string>();
        var start = 0;

        while (start < text.Length)
        {
            var end = Math.Min(start + chunkSize, text.Length);

            if (end < text.Length)
            {
                for (var i = Math.Min(100, chunkSize - overlap); i > 0; i--)
                {
                    if (end - i < text.Length && ".!?".Contains(text[end - i]))
                    {
                        end = end - i + 1;
                        break;
                    }
                }
            }

            var chunk = text.Substring(start, end - start).Trim();
            if (!string.IsNullOrEmpty(chunk))
                chunks.Add(chunk);

            start = end - overlap;
        }

        return chunks;
    }

    private sealed class KbDocument
    {
        public string Content { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public KbMetadata Metadata { get; set; } = new();
    }

    private sealed class KbMetadata
    {
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime Modified { get; set; }
    }
}
