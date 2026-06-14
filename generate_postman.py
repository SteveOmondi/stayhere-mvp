"""Generate StayHere Complete API Postman Collection v2.1.0"""
import json, uuid

BASE = "{{baseUrl}}"

def item(name, method, path, body=None, noauth=False, query=None, form=False):
    raw_url = BASE + "/" + path
    if query:
        raw_url += "?" + "&".join(f"{k}={v}" for k, v in query.items())
    parts = path.split("/")
    req = {
        "method": method.upper(),
        "header": [],
        "url": {
            "raw": raw_url,
            "host": [BASE],
            "path": parts,
        }
    }
    if noauth:
        req["auth"] = {"type": "noauth"}
    if body and not form:
        req["header"].append({"key": "Content-Type", "value": "application/json"})
        req["body"] = {
            "mode": "raw",
            "raw": json.dumps(body, indent=2),
            "options": {"raw": {"language": "json"}}
        }
    if query:
        req["url"]["query"] = [{"key": k, "value": v} for k, v in query.items()]
    if form:
        req["body"] = {
            "mode": "formdata",
            "formdata": [{"key": "file", "type": "file", "src": ""}]
        }
    return {"name": name, "request": req, "response": []}

def folder(name, items):
    return {"name": name, "item": items}

# ─── Payloads ───────────────────────────────────────────────────────────────

signup_body = {
    "FullName": "Jane Doe",
    "Email": "jane@example.com",
    "PhoneNumber": "+254712345678",
    "Password": "Password123!",
    "UserType": "Tenant"
}
login_body = {"Email": "jane@example.com", "PhoneNumber": None, "EntraToken": None}
verify_phone_body = {"PhoneNumber": "+254712345678", "otp": "123456"}
verify_email_body = {"PhoneNumber": "jane@example.com", "otp": "123456"}
onboard_body = {"UserId": "{{userId}}", "Role": "Tenant", "FullName": "Jane Doe", "Phone": "+254712345678", "Email": "jane@example.com"}
signup_and_onboard_body = {
    "FullName": "Jane Doe",
    "Email": "jane@example.com",
    "PhoneNumber": "+254712345678",
    "Role": "Tenant"
}
profile_update_body = {"FullName": "Jane Doe Updated", "ProfilePictureUrl": "https://pub.r2.stayhere.com/profiles/avatars/photo.jpg"}

create_property_body = {
    "BuildingName": "Sunshine Apartments",
    "Description": "Modern apartment complex in Nairobi",
    "TotalUnits": 24,
    "TotalFloors": 6,
    "Location": {
        "Country": "Kenya",
        "County": "Nairobi",
        "City": "Nairobi",
        "Suburb": "Westlands",
        "Street": "Waiyaki Way",
        "Latitude": -1.2676,
        "Longitude": 36.8062
    },
    "PrimaryImageUrl": "https://pub.r2.stayhere.com/properties/images/main.jpg",
    "Images": []
}

create_listing_body = {
    "PropertyId": "{{propertyId}}",
    "UnitNumber": "A101",
    "FloorNumber": 1,
    "Title": "Modern 2BR Apartment in Westlands",
    "Description": "Spacious and well-lit 2-bedroom apartment with modern finishes.",
    "Price": 45000,
    "PriceCurrency": "KES",
    "PropertyType": "Apartment",
    "ListingType": "Rental",
    "Bedrooms": 2,
    "Bathrooms": 1,
    "IsFurnished": False,
    "Location": {
        "Country": "Kenya",
        "County": "Nairobi",
        "City": "Nairobi",
        "Suburb": "Westlands",
        "Street": "Waiyaki Way",
        "Latitude": -1.2676,
        "Longitude": 36.8062
    },
    "Amenities": ["WiFi", "Parking", "Security", "Water"],
    "Images": [],
    "SizeSqft": 850,
    "YearBuilt": 2020,
    "Developer": "Acacia Developers",
    "Owner": {"Name": "Michael Otieno", "Phone": "+254712345678", "Email": "owner@example.com"},
    "Agent": None,
    "PrimaryImageUrl": "https://pub.r2.stayhere.com/properties/images/unit.jpg"
}

search_body = {
    "City": "Nairobi",
    "County": "Nairobi",
    "PropertyType": "Apartment",
    "ListingType": "Rental",
    "MinPrice": 20000,
    "MaxPrice": 60000,
    "MinBedrooms": 2,
    "MaxBedrooms": 3,
    "IsFurnished": None,
    "AvailabilityStatus": "Available",
    "Page": 1,
    "PageSize": 20
}

create_booking_body = {
    "ListingId": "{{listingId}}",
    "CustomerId": "{{customerId}}",
    "PreferredDate": "2026-07-15T00:00:00Z",
    "PreferredTime": "10:00 AM",
    "ViewingType": "InPerson",
    "Notes": "Please show the parking area",
    "ContactPhone": "+254712345678"
}
update_booking_body = {"OwnerNotes": "Please bring your national ID", "MeetingLink": "https://meet.google.com/abc-defg-hij"}

create_application_body = {"ListingId": "{{listingId}}", "CustomerId": "{{customerId}}", "ViewingBookingId": "{{bookingId}}"}
add_doc_body = {
    "DocumentType": "NationalID",
    "FileUrl": "https://pub.r2.stayhere.com/applications/documents/national_id.pdf",
    "FileName": "national_id.pdf"
}
review_body = {"Decision": "Approved", "Reason": "Applicant meets all requirements", "ReviewerEmail": "owner@example.com"}
accept_terms_body = {"SignatureUrl": "https://pub.r2.stayhere.com/profiles/documents/signature.png"}

upsert_terms_body = {
    "Title": "Standard Lease Agreement",
    "TermsContent": "By signing this agreement, the tenant agrees to abide by all house rules...",
    "HouseRules": "No pets allowed. No smoking indoors. Visitors must leave by 10 PM.",
    "SecurityDeposit": 45000,
    "AdminFee": 5000,
    "Currency": "KES",
    "MpesaPaybill": "400200",
    "MpesaTill": None,
    "BankName": "Equity Bank",
    "BankAccountNumber": "0123456789",
    "OnboardingInstructions": "Please bring originals of all documents on signing day.",
    "AccessInstructions": "Gate code is 1234. Ask caretaker John for keys.",
    "ItemsToCarry": "National ID, KRA PIN, 3 months payslips, passport photo"
}

presigned_body = {
    "Folder": "applications/documents",
    "FileName": "national_id.pdf",
    "ContentType": "application/pdf",
    "ExpiryMinutes": 15
}

create_customer_body = {
    "Email": "tenant@example.com",
    "Phone": "+254712345678",
    "FirstName": "Jane",
    "LastName": "Doe",
    "DisplayName": "Jane Doe",
    "CountryId": "{{categoryId}}",
    "CityId": "{{categoryId}}",
    "PreferredLanguage": "en",
    "PreferredCurrency": "KES"
}
update_customer_body = {
    "FirstName": "Jane",
    "LastName": "Doe",
    "DisplayName": "Jane Doe",
    "AddressLine": "123 Main Street, Westlands",
    "DateOfBirth": "1995-06-15T00:00:00Z",
    "IdType": "NationalID",
    "IdNumber": "12345678",
    "PreferredLanguage": "en",
    "PreferredCurrency": "KES",
    "ProfilePhotoUrl": "https://pub.r2.stayhere.com/profiles/avatars/photo.jpg"
}
add_customer_property_body = {"PropertyId": "{{propertyId}}"}
add_customer_doc_body = {
    "EntityType": "Customer",
    "EntityId": "{{customerId}}",
    "DocumentType": "NationalID",
    "FileUrl": "https://pub.r2.stayhere.com/profiles/documents/id.pdf"
}

create_owner_body = {"FullName": "Michael Otieno", "Phone": "+254712345678", "Email": "owner@example.com", "UserId": "{{userId}}"}
update_owner_body = {"FullName": "Michael Otieno", "Phone": "+254712345678", "Email": "owner@example.com"}
create_agent_body = {"FullName": "Sales Agent", "Phone": "+254712345678", "Email": "agent@example.com"}
create_caretaker_body = {"FullName": "John Caretaker", "Phone": "+254712345678", "Email": "caretaker@example.com"}

create_category_body = {"Name": "Apartments", "Description": "Apartment-style listings", "Type": "PropertyType", "City": "Nairobi", "Country": "Kenya"}
update_category_body = {"Name": "Apartments Updated", "Description": "Updated description"}
create_user_type_body = {"Name": "PropertyOwner", "Description": "A property owner account"}
create_user_role_body = {"Name": "Agent", "Description": "A listing agent role"}

chat_body = {"Query": "I need a 2 bedroom apartment in Nairobi under 40000 KES", "ConversationId": "{{conversationId}}", "UserId": "{{userId}}"}
respond_body = {"Query": "Show me affordable listings in Westlands with parking", "ConversationId": "{{conversationId}}", "UserId": "{{userId}}"}

stk_body = {"ApplicationId": "{{applicationId}}", "PhoneNumber": "254712345678", "PaymentType": "SecurityDeposit", "Amount": 45000}
manual_confirm_body = {"Reference": "REF12345", "Notes": "Confirmed via bank statement reference"}

# ─── Auth Service ─────────────────────────────────────────────────────────────

auth_items = [
    item("[Public] Register + Onboard (One Step)", "POST", "auth/register", signup_and_onboard_body, noauth=True),
    item("[Public] Signup (Auth Only)", "POST", "auth/signup", signup_body, noauth=True),
    item("[Public] Login", "POST", "auth/login", login_body, noauth=True),
    item("[Public] Verify OTP (Phone)", "POST", "auth/verifyotp", verify_phone_body, noauth=True),
    item("[Public] Verify OTP (Email)", "POST", "auth/verifyotp", verify_email_body, noauth=True),
    item("Get User Profile", "GET", "auth/profiles/{{userId}}"),
    item("Update Profile", "PATCH", "auth/profile/update", profile_update_body),
    item("[Admin] Get All Users", "GET", "auth/users"),
    item("[Admin] Get User by ID", "GET", "auth/users/{{userId}}"),
    item("Onboard User (Separate Step)", "POST", "auth/onboard", onboard_body),
]

# ─── Property Service ─────────────────────────────────────────────────────────

listing_items = [
    item("Create Listing", "POST", "property/listings", create_listing_body),
    item("Get Listings by Property", "GET", "property/properties/{{propertyId}}/listings"),
    item("Get Listing by ID", "GET", "property/listings/{{listingId}}"),
    item("Get Listing by Code", "GET", "property/listings/code/LST-001"),
    item("[Admin] Get All Listings", "GET", "property/listings"),
    item("Get Listings by Property ID", "GET", "property/listings/property/{{propertyId}}"),
    item("Get Listings by Owner", "GET", "property/listings/owner/{{ownerId}}"),
    item("Get Listings by City", "GET", "property/listings/city/Nairobi"),
    item("Get Listings by County", "GET", "property/listings/county/Nairobi"),
    item("Get Listings by Location", "GET", "property/listings/by-location", query={"location": "Westlands Nairobi"}),
    item("Get Listings by Property Type", "GET", "property/listings/type/Apartment"),
    item("Get Listings by Listing Type", "GET", "property/listings/listing-type/Rental"),
    item("Get Featured Listings", "GET", "property/listings/featured"),
    item("Get Available Listings", "GET", "property/listings/available"),
    item("Search Listings", "POST", "property/listings/search", search_body),
    item("Update Listing", "PUT", "property/listings/{{listingId}}", create_listing_body),
    item("[Admin] Generate Listing Embedding", "POST", "property/listings/{{listingId}}/embedding"),
    item("Update Listing Availability", "PATCH", "property/listings/{{listingId}}/availability", {"AvailabilityStatus": "Available"}),
    item("Update Listing Rating", "PATCH", "property/listings/{{listingId}}/rating", {"NewRating": 4.5}),
    item("Record Listing View", "POST", "property/listings/{{listingId}}/view"),
    item("Toggle Listing Featured", "PATCH", "property/listings/{{listingId}}/featured", {"IsFeatured": True}),
    item("Assign Agent to Listing", "POST", "property/listings/{{listingId}}/agent", {"AgentId": "{{agentId}}", "AgentName": "Sales Agent", "AgentPhone": "+254712345678", "AgentEmail": "agent@example.com"}),
    item("Remove Agent from Listing", "DELETE", "property/listings/{{listingId}}/agent"),
    item("Assign Caretaker to Listing", "POST", "property/listings/{{listingId}}/caretaker", {"CaretakerId": "{{caretakerId}}"}),
    item("Remove Caretaker from Listing", "DELETE", "property/listings/{{listingId}}/caretaker"),
    item("[Admin] Delete Listing", "DELETE", "property/listings/{{listingId}}"),
]

property_items = [
    item("Create Property", "POST", "property/properties", create_property_body),
    item("Get Property by ID", "GET", "property/properties/{{propertyId}}"),
    item("Get Property by Code", "GET", "property/properties/code/PROP-001"),
    item("[Admin] Get All Properties", "GET", "property/properties"),
    item("Get Properties by Owner", "GET", "property/properties/owner/{{ownerId}}"),
    item("Update Property", "PUT", "property/properties/{{propertyId}}", create_property_body),
    item("[Admin] Delete Property", "DELETE", "property/properties/{{propertyId}}"),
]

booking_items = [
    item("Create Viewing Booking", "POST", "property/bookings", create_booking_body),
    item("Get Booking by ID", "GET", "property/bookings/{{bookingId}}"),
    item("Get Bookings by Customer", "GET", "property/bookings/customer/{{customerId}}"),
    item("Get Bookings by Listing", "GET", "property/bookings/listing/{{listingId}}"),
    item("Get Bookings by Owner", "GET", "property/bookings/owner/{{ownerId}}"),
    item("Confirm Booking", "PATCH", "property/bookings/{{bookingId}}/confirm", update_booking_body),
    item("Cancel Booking", "PATCH", "property/bookings/{{bookingId}}/cancel", update_booking_body),
    item("Complete Booking", "PATCH", "property/bookings/{{bookingId}}/complete", update_booking_body),
]

application_items = [
    item("Create Application", "POST", "property/applications", create_application_body),
    item("Get Application by ID", "GET", "property/applications/{{applicationId}}"),
    item("Get Applications by Customer", "GET", "property/applications/customer/{{customerId}}"),
    item("Get Applications by Listing", "GET", "property/applications/listing/{{listingId}}"),
    item("Get Applications by Owner", "GET", "property/applications/owner/{{ownerId}}"),
    item("Add Document to Application", "POST", "property/applications/{{applicationId}}/documents", add_doc_body),
    item("Submit Application", "PATCH", "property/applications/{{applicationId}}/submit"),
    item("Review Application", "PATCH", "property/applications/{{applicationId}}/review", review_body),
    item("Accept Terms", "PATCH", "property/applications/{{applicationId}}/accept-terms", accept_terms_body),
    item("Cancel Application", "PATCH", "property/applications/{{applicationId}}/cancel"),
    item("Get Application Onboarding", "GET", "property/applications/{{applicationId}}/onboarding"),
]

terms_items = [
    item("Create Property Terms", "POST", "property/listings/{{listingId}}/terms", upsert_terms_body),
    item("Update Property Terms", "PUT", "property/listings/{{listingId}}/terms/{{termId}}", upsert_terms_body),
    item("Get Terms by Listing", "GET", "property/listings/{{listingId}}/terms"),
    item("Get Terms by ID", "GET", "property/terms/{{termId}}"),
    item("Delete Terms", "DELETE", "property/terms/{{termId}}"),
]

upload_items = [
    item("Get Presigned Upload URL", "POST", "property/upload/presigned-url", presigned_body),
    item("Upload File (multipart)", "POST", "property/upload/file", form=True),
    item("Get File URL by Key", "GET", "property/upload/url", query={"key": "applications/documents/national_id.pdf"}),
]

property_service = folder("Property Service", [
    folder("Listings", listing_items),
    folder("Properties", property_items),
    folder("Viewing Bookings", booking_items),
    folder("Applications", application_items),
    folder("Property Terms", terms_items),
    folder("File Upload", upload_items),
])

# ─── Customer Service ─────────────────────────────────────────────────────────

customer_items = [
    item("Create Customer", "POST", "customers", create_customer_body),
    item("[Admin] List All Customers", "GET", "customers/list"),
    item("[Admin] Get Customer by ID", "GET", "customers/{{customerId}}"),
    item("[Admin] Get Customer by Phone", "GET", "customers/by-phone/254712345678"),
    item("Get Customer Profile (with filters)", "GET", "customers/profile", query={"countryId": "{{categoryId}}", "cityId": "{{categoryId}}"}),
    item("Get Customers by Owner", "GET", "customers/by-owner/{{ownerId}}"),
    item("Get Customers by Property", "GET", "customers/by-property/{{propertyId}}"),
    item("Get Customers by Listing", "GET", "customers/listings/{{listingId}}/customers"),
    item("Update Customer", "PUT", "customers/{{customerId}}", update_customer_body),
    item("Deactivate Customer", "POST", "customers/{{customerId}}/deactivate"),
    item("Add Property to Customer", "POST", "customers/{{customerId}}/properties", add_customer_property_body),
    item("Get Customer Properties", "GET", "customers/{{customerId}}/properties"),
    item("Add Customer Document", "POST", "customers/{{customerId}}/documents", add_customer_doc_body),
    item("Get Customer Documents", "GET", "customers/{{customerId}}/documents"),
]

# ─── Property Owner Service ───────────────────────────────────────────────────

owner_items = [
    item("Create Property Owner", "POST", "propertyowner/owners", create_owner_body),
    item("Get Owner by ID", "GET", "propertyowner/owners/{{ownerId}}"),
    item("Get Owner by User ID", "GET", "propertyowner/owners/user/{{userId}}"),
    item("Get Owner by Email", "GET", "propertyowner/owners/email/owner%40example.com"),
    item("Update Property Owner", "PUT", "propertyowner/owners/{{ownerId}}", update_owner_body),
    item("Get Owner Wallet", "GET", "propertyowner/owners/{{ownerId}}/wallet"),
    item("Get Owner Properties", "GET", "propertyowner/owners/{{ownerId}}/properties"),
    item("Get Owner Listings", "GET", "propertyowner/owners/{{ownerId}}/listings"),
    item("Get Portal Directory", "GET", "propertyowner/owners/portal-directory"),
    item("[Admin] Get All Owners", "GET", "propertyowner/owners"),
    item("Add Agent to Owner", "POST", "propertyowner/owners/{{ownerId}}/agents", create_agent_body),
    item("Get Agent by ID", "GET", "propertyowner/agents/{{agentId}}"),
    item("Get Owner Agents", "GET", "propertyowner/owners/{{ownerId}}/agents"),
    item("Add Caretaker to Owner", "POST", "propertyowner/owners/{{ownerId}}/caretakers", create_caretaker_body),
    item("Get Caretaker by ID", "GET", "propertyowner/caretakers/{{caretakerId}}"),
    item("Get Owner Caretakers", "GET", "propertyowner/owners/{{ownerId}}/caretakers"),
]

# ─── Static Data Service ─────────────────────────────────────────────────────

static_items = [
    item("Get Categories", "GET", "staticdata/categories"),
    item("Get User Types", "GET", "staticdata/user-types"),
    item("Get User Roles", "GET", "staticdata/user-roles"),
    item("[Admin] Get All Categories", "GET", "staticdata/categories/all"),
    item("Get Category by ID", "GET", "staticdata/categories/{{categoryId}}"),
    item("Get Categories by City", "GET", "staticdata/categories/city/Nairobi"),
    item("Get Categories by Country", "GET", "staticdata/categories/country/Kenya"),
    item("[Admin] Create Category", "POST", "staticdata/categories", create_category_body),
    item("[Admin] Update Category", "PUT", "staticdata/categories/{{categoryId}}", update_category_body),
    item("[Admin] Delete Category", "DELETE", "staticdata/categories/{{categoryId}}"),
    item("[Admin] Create User Role", "POST", "staticdata/user-roles", create_user_role_body),
    item("[Admin] Create User Type", "POST", "staticdata/user-types", create_user_type_body),
]

# ─── AI Agent Service ─────────────────────────────────────────────────────────

ai_items = [
    item("Chat with AI Agent", "POST", "aiagent/chat", chat_body),
    item("Respond & Recommend", "POST", "aiagent/respondandrecommend", respond_body),
    item("[Admin] Knowledge Base Status", "GET", "aiagent/knowledge/status"),
    item("[Public] Search Listings (AI)", "GET", "aiagent/listings", noauth=True,
         query={"listing_id": "", "listing_code": "", "location": "Westlands", "amenity": ""}),
    item("[Public] Health Check", "GET", "aiagent/health", noauth=True),
]

# ─── Payments Service ─────────────────────────────────────────────────────────

payments_items = [
    folder("M-Pesa STK Push", [
        item("Initiate STK Push", "POST", "payments/mpesa/stk/initiate", stk_body),
        item("[Webhook] STK Callback", "POST", "payments/mpesa/stk/callback", noauth=True),
        item("[Admin] Query STK Status", "GET", "payments/mpesa/stk/query/{{checkoutRequestId}}"),
    ]),
    folder("M-Pesa C2B", [
        item("[Admin] Register C2B URLs", "POST", "payments/mpesa/c2b/register"),
        item("[Webhook] C2B Validate", "POST", "payments/mpesa/c2b/validate", noauth=True),
        item("[Webhook] C2B Confirm", "POST", "payments/mpesa/c2b/confirm", noauth=True),
    ]),
    folder("Payment Queries", [
        item("Get Payment by ID", "GET", "payments/{{paymentId}}"),
        item("Get Payments by Application", "GET", "payments/application/{{applicationId}}"),
        item("[Admin] Get Unmatched Payments", "GET", "payments/unmatched"),
        item("Manual Confirm Payment", "PATCH", "payments/{{paymentId}}/manual-confirm", manual_confirm_body),
        item("[Admin] Match Payment to Application", "PATCH", "payments/{{paymentId}}/match/{{applicationId}}"),
    ]),
]

# ─── Assemble Collection ─────────────────────────────────────────────────────

collection = {
    "info": {
        "name": "StayHere Complete API Collection",
        "_postman_id": str(uuid.uuid4()),
        "description": (
            "Complete API collection for StayHere MVP — all function apps.\n\n"
            "Base URL: https://apim-dev-5c27bcf3.azure-api.net\n\n"
            "All endpoints require a Bearer token (Authorization header) unless marked:\n"
            "  [Public]  — anonymous, no auth required\n"
            "  [Webhook] — called by Safaricom, no auth\n"
            "  [Admin]   — requires Admin role\n\n"
            "Set the 'token' collection variable with a valid JWT before using."
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        {"key": "baseUrl",           "value": "https://apim-dev-5c27bcf3.azure-api.net", "type": "string"},
        {"key": "token",             "value": "", "type": "string"},
        {"key": "userId",            "value": "", "type": "string"},
        {"key": "customerId",        "value": "", "type": "string"},
        {"key": "ownerId",           "value": "", "type": "string"},
        {"key": "listingId",         "value": "", "type": "string"},
        {"key": "propertyId",        "value": "", "type": "string"},
        {"key": "bookingId",         "value": "", "type": "string"},
        {"key": "applicationId",     "value": "", "type": "string"},
        {"key": "paymentId",         "value": "", "type": "string"},
        {"key": "termId",            "value": "", "type": "string"},
        {"key": "agentId",           "value": "", "type": "string"},
        {"key": "caretakerId",       "value": "", "type": "string"},
        {"key": "checkoutRequestId", "value": "", "type": "string"},
        {"key": "categoryId",        "value": "", "type": "string"},
        {"key": "conversationId",    "value": "", "type": "string"},
    ],
    "auth": {
        "type": "bearer",
        "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]
    },
    "item": [
        folder("Auth Service", auth_items),
        property_service,
        folder("Customer Service", customer_items),
        folder("Property Owner Service", owner_items),
        folder("Static Data Service", static_items),
        folder("AI Agent Service", ai_items),
        folder("Payments Service", payments_items),
    ]
}

# count items
def count_requests(node):
    if "request" in node:
        return 1
    return sum(count_requests(c) for c in node.get("item", []))

total = sum(count_requests(f) for f in collection["item"])

out = "d:/Projects/StayHereProject_MVP/stayhere-mvp/StayHere_Complete_API_Postman_Collection.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(collection, f, indent=2)

print("Saved: " + out)
print("Total endpoints: " + str(total))
