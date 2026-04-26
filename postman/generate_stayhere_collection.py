#!/usr/bin/env python3
"""Generate StayHere.postman_collection.json — run from repo root: python postman/generate_stayhere_collection.py"""
import json
from pathlib import Path

OUT = Path(__file__).parent / "StayHere.postman_collection.json"


def req(name, method, var_key, path, body=None, extra_headers=None, desc=""):
    h = [{"key": "Content-Type", "value": "application/json"}]
    if extra_headers:
        h.extend(extra_headers)
    item = {
        "name": name,
        "request": {
            "method": method,
            "header": h if method in ("POST", "PUT", "PATCH") or extra_headers else [],
            "url": f"{{{{{var_key}}}}}/{path.lstrip('/')}",
            "description": desc,
        },
    }
    if body is not None:
        item["request"]["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2)}
    return item


def folder(name, items, desc=""):
    return {"name": name, "description": desc, "item": items}


# Sample GUIDs for path placeholders
UID = "11111111-1111-1111-1111-111111111111"
OID = "22222222-2222-2222-2222-222222222222"
LID = "9aa1052f-d3b5-4e79-8d7c-cb580c9731f7"
PID = "33333333-3333-3333-3333-333333333333"
CID = "44444444-4444-4444-4444-444444444444"
AID = "55555555-5555-5555-5555-555555555555"
CAT = "66666666-6666-6666-6666-666666666666"

loc_ke = {
    "country": "Kenya",
    "county": "Nairobi",
    "city": "Nairobi",
    "suburb": "Westlands",
    "street": "Waiyaki Way",
    "latitude": -1.267,
    "longitude": 36.81,
}

owner_contact = {"name": "Jane Owner", "phone": "+254712000000", "email": "owner@example.com"}
agent_contact = {"name": "Alex Agent", "phone": "+254722000000", "email": "agent@example.com"}

auth = folder(
    "AuthService",
    [
        req(
            "Signup",
            "POST",
            "baseUrl_AuthService",
            "auth/signup",
            {"email": "user@example.com", "phoneNumber": "+254700000000", "fullName": "Test User", "userType": "Individual"},
        ),
        req(
            "Login (request OTP email)",
            "POST",
            "baseUrl_AuthService",
            "auth/login",
            {"email": "user@example.com"},
        ),
        req(
            "Login (request OTP SMS)",
            "POST",
            "baseUrl_AuthService",
            "auth/login",
            {"phoneNumber": "+254700000000"},
        ),
        req(
            "Login (Entra token)",
            "POST",
            "baseUrl_AuthService",
            "auth/login",
            {"entraToken": "<azure-ad-access-token>"},
        ),
        req(
            "Verify OTP",
            "POST",
            "baseUrl_AuthService",
            "auth/verifyotp",
            {"target": "user@example.com", "code": "123456"},
        ),
        req(
            "Get profiles for user",
            "GET",
            "baseUrl_AuthService",
            f"auth/profiles/{UID}",
            None,
        ),
        req(
            "Onboard user",
            "POST",
            "baseUrl_AuthService",
            "auth/onboard",
            {
                "userId": UID,
                "role": "PropertyOwner",
                "fullName": "Onboarded User",
                "phone": "+254700000001",
                "email": "onboarded@example.com",
            },
        ),
    ],
    "Identity: signup, OTP login, profiles, post-login onboarding.",
)

hdr_x_user = [{"key": "X-User-Id", "value": OID, "description": "Required when SKIP_AUTH=true on PropertyService — must match property/listing owner_id (PropertyOwner id)."}]
hdr_bearer_static = [{"key": "Authorization", "value": "Bearer mock-jwt-token", "description": "StaticDataService admin routes when SKIP_AUTH is not true."}]

property_items = [
    req("Create property", "POST", "baseUrl_PropertyService", "properties", {
        "buildingName": "Fairdeal Apartments",
        "description": "Secure block near Waiyaki Way",
        "totalUnits": 24,
        "totalFloors": 8,
        "location": loc_ke,
    }, hdr_x_user),
    req("Get property by id", "GET", "baseUrl_PropertyService", f"properties/{PID}"),
    req("Get property by code", "GET", "baseUrl_PropertyService", "properties/code/P1001"),
    req("Get all properties", "GET", "baseUrl_PropertyService", "properties?page=1&pageSize=20"),
    req("Get properties by owner", "GET", "baseUrl_PropertyService", f"properties/owner/{OID}?page=1&pageSize=20"),
    req("Update property", "PUT", "baseUrl_PropertyService", f"properties/{PID}", {
        "buildingName": "Fairdeal Apartments (updated)",
        "description": "Updated",
        "totalUnits": 24,
        "totalFloors": 8,
        "location": loc_ke,
    }, hdr_x_user),
    req("Delete property", "DELETE", "baseUrl_PropertyService", f"properties/{PID}", None, hdr_x_user),
]

listing_items = [
    req("Create listing", "POST", "baseUrl_PropertyService", "listings", {
        "propertyId": PID,
        "unitNumber": "5A",
        "floorNumber": 3,
        "title": "2BR apartment",
        "description": "Bright corner unit",
        "price": 85000,
        "priceCurrency": "KES",
        "propertyType": "Apartment",
        "listingType": "Rent",
        "bedrooms": 2,
        "bathrooms": 2,
        "isFurnished": False,
        "location": loc_ke,
        "amenities": ["Parking", "Balcony"],
        "images": [],
        "sizeSqft": 900,
        "yearBuilt": 2018,
        "developer": None,
        "owner": owner_contact,
        "agent": agent_contact,
    }, hdr_x_user),
    req("Create listing from property", "POST", "baseUrl_PropertyService", f"properties/{PID}/listings", {
        "unitNumber": "6B",
        "floorNumber": 4,
        "title": "Studio",
        "description": None,
        "price": 45000,
        "priceCurrency": "KES",
        "propertyType": "Studio",
        "listingType": "Rent",
        "bedrooms": 0,
        "bathrooms": 1,
        "isFurnished": False,
        "location": None,
        "amenities": ["Water backup"],
        "images": [],
        "owner": owner_contact,
        "agent": None,
    }, hdr_x_user),
    req("Get listing by id", "GET", "baseUrl_PropertyService", f"listings/{LID}"),
    req("Get listing by code", "GET", "baseUrl_PropertyService", "listings/code/L1001"),
    req("Get all listings", "GET", "baseUrl_PropertyService", "listings?page=1&pageSize=20"),
    req("Get listings by property", "GET", "baseUrl_PropertyService", f"listings/property/{PID}?page=1&pageSize=20"),
    req("Get listings by owner", "GET", "baseUrl_PropertyService", f"listings/owner/{OID}?page=1&pageSize=20"),
    req("Get listings by city", "GET", "baseUrl_PropertyService", "listings/city/Nairobi?page=1&pageSize=20"),
    req("Get listings by county", "GET", "baseUrl_PropertyService", "listings/county/Nairobi?page=1&pageSize=20"),
    req("Get listings by location (query)", "GET", "baseUrl_PropertyService", "listings/by-location?location=westlands&page=1&pageSize=20"),
    req("Get listings by property type", "GET", "baseUrl_PropertyService", "listings/type/Apartment?page=1&pageSize=20"),
    req("Get listings by listing type", "GET", "baseUrl_PropertyService", "listings/listing-type/Rent?page=1&pageSize=20"),
    req("Get featured listings", "GET", "baseUrl_PropertyService", "listings/featured?limit=10"),
    req("Get available listings", "GET", "baseUrl_PropertyService", "listings/available?page=1&pageSize=20"),
    req("Search listings (POST)", "POST", "baseUrl_PropertyService", "listings/search", {
        "city": "Nairobi",
        "suburb": "Westlands",
        "minPrice": 50000,
        "maxPrice": 120000,
        "propertyType": "Apartment",
        "listingType": "Rent",
        "page": 1,
        "pageSize": 20,
        "sortDescending": True,
    }),
    req("Update listing", "PUT", "baseUrl_PropertyService", f"listings/{LID}", {
        "title": "Updated title",
        "price": 90000,
        "amenities": ["Parking", "Balcony", "Water backup"],
    }, hdr_x_user),
    req("Regenerate listing embedding", "POST", "baseUrl_PropertyService", f"listings/{LID}/embedding", {}, hdr_x_user),
    req("Patch listing availability", "PATCH", "baseUrl_PropertyService", f"listings/{LID}/availability", {"availabilityStatus": "Available"}, hdr_x_user),
    req("Patch listing rating", "PATCH", "baseUrl_PropertyService", f"listings/{LID}/rating", {"newRating": 4.5}),
    req("Post listing view", "POST", "baseUrl_PropertyService", f"listings/{LID}/view", {}),
    req("Patch listing featured", "PATCH", "baseUrl_PropertyService", f"listings/{LID}/featured", {"isFeatured": True}),
    req("Assign listing agent", "POST", "baseUrl_PropertyService", f"listings/{LID}/agent", {
        "agentId": AID,
        "agentName": "Alex Agent",
        "agentPhone": "+254722000000",
        "agentEmail": "agent@example.com",
    }, hdr_x_user),
    req("Remove listing agent", "DELETE", "baseUrl_PropertyService", f"listings/{LID}/agent", None, hdr_x_user),
    req("Assign listing caretaker", "POST", "baseUrl_PropertyService", f"listings/{LID}/caretaker", {"caretakerId": UID}, hdr_x_user),
    req("Remove listing caretaker", "DELETE", "baseUrl_PropertyService", f"listings/{LID}/caretaker", None, hdr_x_user),
    req("Delete listing", "DELETE", "baseUrl_PropertyService", f"listings/{LID}", None, hdr_x_user),
]

property = folder(
    "PropertyService",
    [
        folder("Properties", property_items),
        folder("Listings", listing_items),
    ],
    "Buildings (properties) and rentable units (listings). Uses X-User-Id when SKIP_AUTH=true.",
)

customer = folder(
    "CustomerService",
    [
        req("Create customer", "POST", "baseUrl_CustomerService", "customers", {
            "email": "renter@example.com",
            "phone": "+254733000000",
            "firstName": "Sam",
            "lastName": "Renter",
            "displayName": "Sam R.",
            "countryId": None,
            "cityId": None,
            "preferredLanguage": "en",
            "preferredCurrency": "KES",
        }),
        req("List customers", "GET", "baseUrl_CustomerService", "customers/list"),
        req("Get customer by id", "GET", "baseUrl_CustomerService", f"customers/{CID}"),
        req("Get customer by phone", "GET", "baseUrl_CustomerService", "customers/by-phone/%2B254733000000"),
        req("Get customers by region", "GET", "baseUrl_CustomerService", "customers/profile?countryId=&cityId="),
        req("Get customers by listing", "GET", "baseUrl_CustomerService", f"listings/{LID}/customers"),
        req("Update customer", "PUT", "baseUrl_CustomerService", f"customers/{CID}", {
            "firstName": "Sam",
            "lastName": "Renter",
            "displayName": "Sam R.",
            "addressLine": "Westlands",
        }),
        req("Deactivate customer", "POST", "baseUrl_CustomerService", f"customers/{CID}/deactivate", {}),
        req("Attach customer property", "POST", "baseUrl_CustomerService", f"customers/{CID}/properties", {
            "listingId": LID,
            "relationshipType": "Interested",
            "agreedPrice": None,
            "currency": "KES",
        }),
        req("Get customer properties", "GET", "baseUrl_CustomerService", f"customers/{CID}/properties"),
        req("Add customer document", "POST", "baseUrl_CustomerService", f"customers/{CID}/documents", {
            "entityType": "Customer",
            "entityId": CID,
            "documentType": "ID",
            "fileUrl": "https://storage.example.com/id.pdf",
        }),
        req("Get customer documents", "GET", "baseUrl_CustomerService", f"customers/{CID}/documents"),
    ],
    "Renter / customer profiles, KYC documents, saved interests.",
)

owner = folder(
    "PropertyOwnerService",
    [
        req("Create property owner", "POST", "baseUrl_PropertyOwnerService", "owners", {
            "fullName": "Jane Landlord",
            "phone": "+254711000000",
            "email": "landlord@example.com",
            "userId": UID,
        }),
        req("Get owner by id", "GET", "baseUrl_PropertyOwnerService", f"owners/{OID}"),
        req("Get owner by user id", "GET", "baseUrl_PropertyOwnerService", f"owners/user/{UID}"),
        req("Get owner by email", "GET", "baseUrl_PropertyOwnerService", "owners/email/landlord%40example.com"),
        req("Update owner", "PUT", "baseUrl_PropertyOwnerService", f"owners/{OID}", {"fullName": "Jane L.", "phone": "+254711000000", "email": "landlord@example.com"}),
        req("Get owner wallet", "GET", "baseUrl_PropertyOwnerService", f"owners/{OID}/wallet"),
        req("Get owner properties", "GET", "baseUrl_PropertyOwnerService", f"owners/{OID}/properties"),
        req("Get owner listings", "GET", "baseUrl_PropertyOwnerService", f"owners/{OID}/listings?page=1&pageSize=20"),
        req("Create agent", "POST", "baseUrl_PropertyOwnerService", f"owners/{OID}/agents", {"fullName": "Agent Lee", "phone": "+254722000001", "email": "agent@example.com"}),
        req("Get agent by id", "GET", "baseUrl_PropertyOwnerService", f"agents/{AID}"),
        req("Get owner agents", "GET", "baseUrl_PropertyOwnerService", f"owners/{OID}/agents"),
        req("Create caretaker", "POST", "baseUrl_PropertyOwnerService", f"owners/{OID}/caretakers", {"fullName": "Caretaker Kim", "phone": "+254733000001", "email": None}),
        req("Get caretaker by id", "GET", "baseUrl_PropertyOwnerService", f"caretakers/{UID}"),
        req("Get owner caretakers", "GET", "baseUrl_PropertyOwnerService", f"owners/{OID}/caretakers"),
        req("List owners (paginated)", "GET", "baseUrl_PropertyOwnerService", "owners?page=1&pageSize=20"),
        req("Portal owner directory (flat)", "GET", "baseUrl_PropertyOwnerService", "owners/portal-directory?max=500"),
    ],
    "Landlord accounts, wallet, agents, caretakers.",
)

static_items = [
    req("Get active categories", "GET", "baseUrl_StaticDataService", "categories"),
    req("Get user types", "GET", "baseUrl_StaticDataService", "user-types"),
    req("Get user roles", "GET", "baseUrl_StaticDataService", "user-roles"),
    req("Get all categories (admin)", "GET", "baseUrl_StaticDataService", "categories/all", None, hdr_bearer_static),
    req("Get category by id", "GET", "baseUrl_StaticDataService", f"categories/{CAT}"),
    req("Get categories by city", "GET", "baseUrl_StaticDataService", "categories/city/Nairobi"),
    req("Get categories by country", "GET", "baseUrl_StaticDataService", "categories/country/Kenya"),
    req("Create category (admin)", "POST", "baseUrl_StaticDataService", "categories", {
        "name": "Short stay",
        "description": "Nightly rentals",
        "iconUrl": None,
        "country": "Kenya",
        "city": "Nairobi",
        "isActive": True,
        "sortOrder": 10,
    }, hdr_bearer_static),
    req("Update category (admin)", "PUT", "baseUrl_StaticDataService", f"categories/{CAT}", {"name": "Short stay+", "isActive": True}, hdr_bearer_static),
    req("Delete category (admin)", "DELETE", "baseUrl_StaticDataService", f"categories/{CAT}", None, hdr_bearer_static),
]

static = folder(
    "StaticDataService",
    static_items,
    "Reference data: categories, enums. Mutating routes need Authorization: Bearer mock-jwt-token unless SKIP_AUTH=true.",
)

ai = folder(
    "AiAgentService",
    [
        req("Chat (knowledge + LLM)", "POST", "baseUrl_AiAgentService", "chat", {
            "query": "What are typical rents in Westlands?",
            "conversationId": None,
            "maxTokens": 800,
            "temperature": 0.7,
        }),
        req("Respond and recommend", "POST", "baseUrl_AiAgentService", "respondandrecommend", {
            "query": "2 bedroom under 100k in Kilimani",
            "conversationId": None,
            "maxResults": 5,
            "temperature": 0.7,
        }),
        req("Knowledge base status", "GET", "baseUrl_AiAgentService", "knowledge/status"),
        req("Agent listing search", "GET", "baseUrl_AiAgentService", f"listings?listing_id={LID}&location=Nairobi&amenity=Balcony"),
        req("Health", "GET", "baseUrl_AiAgentService", "health"),
    ],
    "AI chat, recommendations, knowledge status, lightweight listing lookup for the agent.",
)

collection = {
    "info": {
        "_postman_id": "stayhere-mvp-collection",
        "name": "StayHere — All Function Apps",
        "description": "HTTP APIs for StayHere MVP Azure Functions. Set each baseUrl_* to your local func host (include /api). PropertyService uses X-User-Id when SKIP_AUTH=true.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "baseUrl_AuthService", "value": "http://localhost:7100/api"},
        {"key": "baseUrl_PropertyService", "value": "http://localhost:7101/api"},
        {"key": "baseUrl_CustomerService", "value": "http://localhost:7102/api"},
        {"key": "baseUrl_PropertyOwnerService", "value": "http://localhost:7103/api"},
        {"key": "baseUrl_StaticDataService", "value": "http://localhost:7104/api"},
        {"key": "baseUrl_AiAgentService", "value": "http://localhost:7105/api"},
    ],
    "item": [auth, property, customer, owner, static, ai],
}

# Fix GET requests: remove Content-Type if no body
for top in collection["item"]:
    if "item" in top and isinstance(top["item"], list) and top["item"] and "request" not in top["item"][0]:
        for sub in top["item"]:
            for it in sub.get("item", []):
                r = it["request"]
                if r["method"] == "GET" and "body" not in r:
                    r["header"] = [h for h in r.get("header", []) if h.get("key") != "Content-Type"]
    else:
        for it in top.get("item", []):
            r = it["request"]
            if r["method"] == "GET" and "body" not in r:
                r["header"] = [h for h in r.get("header", []) if h.get("key") != "Content-Type"]
            if r["method"] == "DELETE" and "body" not in r:
                r["header"] = [h for h in r.get("header", []) if h.get("key") != "Content-Type"]

OUT.write_text(json.dumps(collection, indent=2), encoding="utf-8")
print("Wrote", OUT)
