"""Generate StayHere R2 Upload Test Postman Collection"""
import json, uuid

LOCAL  = "http://localhost:7071/api"
PROD   = "https://apim-dev-5c27bcf3.azure-api.net/property"

# Tests script: captures presigned URL response into collection variables
CAPTURE_PRESIGNED = """
var data = pm.response.json();
pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("uploadUrl present", () => pm.expect(data.uploadUrl).to.be.a('string'));

// Trim whitespace/newlines — a stray character at the end corrupts the SigV4 signature.
var uploadUrl = (data.uploadUrl || "").trim();
pm.collectionVariables.set("r2_uploadUrl",     uploadUrl);
pm.collectionVariables.set("r2_contentType",   (data.contentType || "").trim());
pm.collectionVariables.set("r2_fileKey",       (data.fileKey    || "").trim());
pm.collectionVariables.set("r2_publicUrl",     (data.publicUrl  || "").trim());

console.log("Presigned URL captured — expires:", data.expiresAt);
console.log("PUT to:", uploadUrl);
console.log("Content-Type:", data.contentType);
console.log("Public URL (after upload):", data.publicUrl);
""".strip()

VERIFY_PUT = """
pm.test("Upload succeeded (200 or 204)", () => {
    pm.expect(pm.response.code).to.be.oneOf([200, 204]);
});
console.log("✅ File uploaded directly to R2. Public URL:", pm.collectionVariables.get("r2_publicUrl"));
""".strip()

VERIFY_MULTIPART = """
var data = pm.response.json();
pm.test("Status 201", () => pm.response.to.have.status(201));
pm.test("publicUrl present", () => pm.expect(data.publicUrl).to.be.a('string'));
pm.collectionVariables.set("r2_fileKey",   data.fileKey);
pm.collectionVariables.set("r2_publicUrl", data.publicUrl);
console.log("✅ Server-proxied upload complete");
console.log("   File key:", data.fileKey);
console.log("   Public URL:", data.publicUrl);
""".strip()

VERIFY_GET_URL = """
var data = pm.response.json();
pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("publicUrl present", () => pm.expect(data.publicUrl).to.be.a('string'));
console.log("✅ Public URL resolved:", data.publicUrl);
""".strip()

def req_json(name, method, url, body=None, headers=None, event=None, description=None, no_auth=False):
    h = [{"key": "Content-Type", "value": "application/json"}]
    if headers:
        h = headers
    r = {
        "method": method,
        "header": h,
        "url": {"raw": url, "host": [url.split("/")[2]], "path": url.split("/")[3:]},
    }
    if body:
        r["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2), "options": {"raw": {"language": "json"}}}
    if description:
        r["description"] = description
    if no_auth:
        r["auth"] = {"type": "noauth"}
    item = {"name": name, "request": r, "response": []}
    if event:
        item["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": event.split("\n")}}]
    return item

def req_binary(name, put_url_var, content_type_var, event=None):
    """PUT request with binary file body (for presigned URL upload)"""
    item = {
        "name": name,
        "request": {
            "method": "PUT",
            "header": [{"key": "Content-Type", "value": f"{{{{{content_type_var}}}}}"}],
            "body": {
                "mode": "file",
                "file": {"src": ""}   # user selects the file in Postman
            },
            # Use ONLY raw — omitting host/path prevents Postman from re-assembling
            # the URL and appending a trailing slash (%2F) that corrupts the signature.
            "url": {
                "raw": f"{{{{{put_url_var}}}}}"
            },
            "description": (
                "PUT the file directly to R2 using the presigned URL from Step 1.\n\n"
                "In Postman:\n"
                "  Body tab → binary → click 'Select File' and pick any image or PDF.\n\n"
                "The Content-Type header is auto-filled from Step 1 ({{r2_contentType}}).\n"
                "DO NOT add an Authorization header — R2 presigned URLs are self-contained.\n\n"
                "R2 returns 200 (no body) on success."
            )
        },
        "response": []
    }
    if event:
        item["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": event.split("\n")}}]
    return item

def req_multipart(name, base_url, folder, no_auth=False):
    """POST with multipart/form-data for server-proxied upload"""
    item = {
        "name": name,
        "request": {
            "method": "POST",
            "header": [],   # Postman sets Content-Type with boundary automatically for formdata
            "body": {
                "mode": "formdata",
                "formdata": [
                    {
                        "key": "folder",
                        "value": folder,
                        "type": "text",
                        "description": "Target folder in R2"
                    },
                    {
                        "key": "file",
                        "type": "file",
                        "src": "",
                        "description": "Click 'Select Files' and pick any image or PDF"
                    }
                ]
            },
            "url": {
                "raw": f"{base_url}/upload/file",
                "host": [base_url.split("/")[2]],
                "path": base_url.split("/")[3:] + ["upload", "file"]
            },
            "description": (
                "API receives the file and uploads it to R2 server-side.\n\n"
                "In Postman:\n"
                "  Body tab → form-data\n"
                "  Row 1: key=folder (Text), value=applications/documents\n"
                "  Row 2: key=file (File), click 'Select Files' and pick a file\n\n"
                "DO NOT set Content-Type manually — Postman adds multipart/form-data with the correct boundary.\n\n"
                "Returns 201 with { fileKey, publicUrl }."
            )
        },
        "response": []
    }
    if no_auth:
        item["request"]["auth"] = {"type": "noauth"}
    item["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": VERIFY_MULTIPART.split("\n")}}]
    return item

def req_get_url(name, base_url, no_auth=False):
    url = f"{base_url}/upload/url?key={{{{r2_fileKey}}}}"
    item = {
        "name": name,
        "request": {
            "method": "GET",
            "header": [],
            "url": {
                "raw": url,
                "host": [base_url.split("/")[2]],
                "path": base_url.split("/")[3:] + ["upload", "url"],
                "query": [{"key": "key", "value": "{{r2_fileKey}}"}]
            },
            "description": (
                "Resolves the public URL for a file already stored in R2.\n"
                "The {{r2_fileKey}} variable is populated automatically after Step 1 or the multipart upload."
            )
        },
        "response": []
    }
    if no_auth:
        item["request"]["auth"] = {"type": "noauth"}
    item["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": VERIFY_GET_URL.split("\n")}}]
    return item

# ─── LOCAL FOLDER ─────────────────────────────────────────────────────────────
# SKIP_AUTH=true in local.settings.json — no Bearer token needed locally

local_presigned_body_image = {
    "folder": "properties/images",
    "fileName": "test-photo.jpg",
    "contentType": "image/jpeg",
    "expiryMinutes": 15
}
local_presigned_body_doc = {
    "folder": "applications/documents",
    "fileName": "national-id.pdf",
    "contentType": "application/pdf",
    "expiryMinutes": 15
}
local_presigned_body_avatar = {
    "folder": "profiles/avatars",
    "fileName": "profile-pic.jpg",
    "contentType": "image/jpeg",
    "expiryMinutes": 15
}

local_pattern_a = {
    "name": "Pattern A — Presigned URL (Client-Direct)",
    "description": {
        "content": (
            "Two-step flow — the API hands out a URL, the client PUTs the file directly to R2.\n"
            "No file bytes pass through the API server.\n\n"
            "Step 1 → Run '1. Get Presigned URL'. The Tests script auto-saves uploadUrl into {{r2_uploadUrl}}.\n"
            "Step 2 → Run '2. PUT File to R2'. Select a file in Body → binary."
        ),
        "type": "text/plain"
    },
    "item": [
        req_json(
            "1. Get Presigned URL (image)",
            "POST", f"{LOCAL}/upload/presigned-url",
            body=local_presigned_body_image,
            event=CAPTURE_PRESIGNED,
            no_auth=True,
            description=(
                "Returns a presigned PUT URL for a JPEG image in properties/images.\n"
                "Run this first — the Tests script saves uploadUrl + contentType + fileKey + publicUrl into collection variables.\n\n"
                "No auth needed locally (SKIP_AUTH=true)."
            )
        ),
        req_json(
            "1b. Get Presigned URL (PDF document)",
            "POST", f"{LOCAL}/upload/presigned-url",
            body=local_presigned_body_doc,
            event=CAPTURE_PRESIGNED,
            no_auth=True,
            description="Same as above but for a PDF in applications/documents."
        ),
        req_json(
            "1c. Get Presigned URL (avatar)",
            "POST", f"{LOCAL}/upload/presigned-url",
            body=local_presigned_body_avatar,
            event=CAPTURE_PRESIGNED,
            no_auth=True,
            description="Same as above but for a profile avatar."
        ),
        req_binary(
            "2. PUT File to R2 (presigned — direct to R2, no API involved)",
            "r2_uploadUrl",
            "r2_contentType",
            event=VERIFY_PUT
        ),
        req_get_url("3. Verify — Get Public URL by File Key", LOCAL, no_auth=True),
    ]
}

local_pattern_b = {
    "name": "Pattern B — Server-Proxied Upload (Multipart)",
    "description": {
        "content": (
            "Single request — POST multipart/form-data to the API. The API forwards bytes to R2.\n"
            "Simpler for testing but less efficient for large files."
        ),
        "type": "text/plain"
    },
    "item": [
        req_multipart("Upload File via API (properties/images)", LOCAL, "properties/images", no_auth=True),
        req_multipart("Upload File via API (applications/documents)", LOCAL, "applications/documents", no_auth=True),
        req_multipart("Upload File via API (profiles/avatars)", LOCAL, "profiles/avatars", no_auth=True),
    ]
}

local_folder = {
    "name": "LOCAL — http://localhost:7071/api (no auth required)",
    "description": {
        "content": (
            "Runs against PropertyService started with:\n"
            "  cd src/FunctionApps/PropertyService && func start\n\n"
            "SKIP_AUTH=true in local.settings.json so no Bearer token is needed.\n"
            "R2 credentials in local.settings.json hit the REAL R2 bucket (stayhere)."
        ),
        "type": "text/plain"
    },
    "item": [local_pattern_a, local_pattern_b]
}

# ─── PRODUCTION FOLDER ────────────────────────────────────────────────────────

prod_presigned_body_image = {
    "folder": "properties/images",
    "fileName": "test-photo.jpg",
    "contentType": "image/jpeg",
    "expiryMinutes": 15
}

prod_pattern_a_items = [
    req_json(
        "1. Get Presigned URL (image)",
        "POST", f"{PROD}/upload/presigned-url",
        body=prod_presigned_body_image,
        event=CAPTURE_PRESIGNED,
        description="Requires Bearer token in the collection auth. Run first."
    ),
    req_binary(
        "2. PUT File to R2 (direct — NO auth header)",
        "r2_uploadUrl",
        "r2_contentType",
        event=VERIFY_PUT
    ),
    req_get_url("3. Verify — Get Public URL by File Key", PROD),
]

prod_folder = {
    "name": "PRODUCTION — APIM (Bearer token required)",
    "description": {
        "content": (
            "Hits the live R2 bucket through APIM.\n"
            "Set the 'token' collection variable to a valid JWT before running.\n\n"
            "Step 2 (PUT to R2) does NOT send the Authorization header — the presigned URL is self-signed."
        ),
        "type": "text/plain"
    },
    "item": [
        {
            "name": "Pattern A — Presigned URL",
            "item": prod_pattern_a_items
        },
        req_multipart("Pattern B — Server-Proxied Upload", PROD, "properties/images"),
        req_get_url("Resolve Public URL by Key", PROD),
    ]
}

# ─── COLLECTION ───────────────────────────────────────────────────────────────

collection = {
    "info": {
        "name": "StayHere — R2 Upload Tests",
        "_postman_id": str(uuid.uuid4()),
        "description": (
            "Tests for the two R2 upload patterns:\n\n"
            "Pattern A (Presigned URL — recommended):\n"
            "  1. POST /upload/presigned-url  → get a signed PUT URL\n"
            "  2. PUT <presignedUrl>           → upload directly to R2 (no API involved)\n\n"
            "Pattern B (Server-proxied — simpler for testing):\n"
            "  1. POST /upload/file (multipart/form-data) → API streams bytes to R2\n\n"
            "LOCAL: run PropertyService with 'func start', no auth needed (SKIP_AUTH=true).\n"
            "PROD:  set collection variable 'token' to a valid JWT."
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        {"key": "r2_uploadUrl",   "value": "", "type": "string"},
        {"key": "r2_contentType", "value": "", "type": "string"},
        {"key": "r2_fileKey",     "value": "", "type": "string"},
        {"key": "r2_publicUrl",   "value": "", "type": "string"},
        {"key": "token",          "value": "", "type": "string"},
    ],
    "auth": {
        "type": "bearer",
        "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]
    },
    "item": [local_folder, prod_folder]
}

out = "d:/Projects/StayHereProject_MVP/stayhere-mvp/StayHere_R2_Upload_Tests.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

def count(node):
    if "request" in node: return 1
    return sum(count(x) for x in node.get("item", []))

total = sum(count(f) for f in collection["item"])
print("Saved:", out)
print("Total requests:", total)
