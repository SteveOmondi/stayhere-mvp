using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddListingEmbeddingHnswIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // suppressTransaction: true is required — PostgreSQL forbids CREATE INDEX CONCURRENTLY
            // inside a transaction block (which EF Core uses by default for migrations).
            migrationBuilder.Sql(
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_embedding_hnsw " +
                "ON listings USING hnsw (embedding vector_cosine_ops) " +
                "WITH (m = 16, ef_construction = 64);",
                suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP INDEX CONCURRENTLY IF EXISTS listings_embedding_hnsw;",
                suppressTransaction: true);
        }
    }
}
