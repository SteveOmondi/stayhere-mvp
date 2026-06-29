# Terraform Import Script for APIM Operations
# This script helps resolve "AlreadyExists" errors by importing existing resources into the Terraform state.

$Env = "dev"
$Suffix = "5c27bcf3" # Update this with the actual suffix from your deployment
$RG = "rg-stayhere-$Env-$Suffix"
$APIM = "apim-$Env-$Suffix"

# Function to import an operation
function Import-Operation {
    param($ResourceName, $ApiName, $OperationId)
    Write-Host "Attempting to import $ResourceName ($OperationId)..."
    
    try {
        # Pass variables from environment (Azure DevOps) to prevent interactive prompts
        # Use -ErrorAction SilentlyContinue so we can handle the exit code manually
        terraform import -input=false `
            -var="mongodb_atlas_public_key=$($env:MONGODB_ATLAS_PUBLIC_KEY)" `
            -var="mongodb_atlas_private_key=$($env:MONGODB_ATLAS_PRIVATE_KEY)" `
            -var="mongodb_atlas_org_id=$($env:MONGODB_ATLAS_ORG_ID)" `
            -var="skip_auth=$($env:SKIP_AUTH)" `
            -var="groq_api_key=$($env:GROQ_API_KEY)" `
            -var="groq_model=$($env:GROQ_MODEL)" `
            -var="google_api_key=$($env:GOOGLE_API_KEY)" `
            -var="google_embedding_model=$($env:GOOGLE_EMBEDDING_MODEL)" `
            -var="onfon_client_id=$($env:ONFON_CLIENT_ID)" `
            -var="onfon_api_key=$($env:ONFON_API_KEY)" `
            -var="onfon_base_url=$($env:ONFON_BASE_URL)" `
            -var="onfon_sender_id=$($env:ONFON_SENDER_ID)" `
            -var="mpesa_consumer_key=$($env:MPESA_CONSUMER_KEY)" `
            -var="mpesa_consumer_secret=$($env:MPESA_CONSUMER_SECRET)" `
            -var="mpesa_passkey=$($env:MPESA_PASSKEY)" `
            -var="mpesa_shortcode=$($env:MPESA_SHORTCODE)" `
            -var="mpesa_environment=$($env:MPESA_ENVIRONMENT)" `
            -var="r2_account_id=$($env:R2_ACCOUNT_ID)" `
            -var="r2_access_key_id=$($env:R2_ACCESS_KEY_ID)" `
            -var="r2_secret_access_key=$($env:R2_SECRET_ACCESS_KEY)" `
            -var="r2_bucket_name=$($env:R2_BUCKET_NAME)" `
            -var="r2_public_base_url=$($env:R2_PUBLIC_BASE_URL)" `
            "module.apim.azurerm_api_management_api_operation.$ResourceName" "/subscriptions/039755a5-67c2-48a5-9304-448c909618f6/resourceGroups/$RG/providers/Microsoft.ApiManagement/service/$APIM/apis/$ApiName/operations/$OperationId" 2>&1 | Out-Null
            
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  SUCCESS: Imported $ResourceName" -ForegroundColor Green
        } else {
            Write-Host "  SKIPPED: Resource already managed or not found in config." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ERROR: Failed to process $ResourceName" -ForegroundColor Red
    }
}

# --- Auth API Operations ---
Import-Operation "op_auth_api_signup" "auth-api" "Signup"
Import-Operation "op_auth_api_login" "auth-api" "Login"
Import-Operation "op_auth_api_verifyotp" "auth-api" "VerifyOtp"
Import-Operation "op_auth_api_getprofiles" "auth-api" "GetProfiles"
Import-Operation "op_auth_api_updateprofile" "auth-api" "UpdateProfile"
Import-Operation "op_auth_api_getallusers" "auth-api" "GetAllUsers"
Import-Operation "op_auth_api_getuserbyid" "auth-api" "GetUserById"
Import-Operation "op_auth_api_onboard" "auth-api" "Onboard"
Import-Operation "op_auth_api_signupandonboard" "auth-api" "SignupAndOnboard"

# --- Property Owner API Operations ---
Import-Operation "op_propertyowner_createpropertyowner" "propertyowner-api" "CreatePropertyOwner"
Import-Operation "op_propertyowner_getpropertyownerbyid" "propertyowner-api" "GetPropertyOwnerById"
Import-Operation "op_propertyowner_getpropertyownerbyuserid" "propertyowner-api" "GetPropertyOwnerByUserId"
Import-Operation "op_propertyowner_getpropertyownerbyemail" "propertyowner-api" "GetPropertyOwnerByEmail"
Import-Operation "op_propertyowner_updatepropertyowner" "propertyowner-api" "UpdatePropertyOwner"
Import-Operation "op_propertyowner_getownerwallet" "propertyowner-api" "GetOwnerWallet"
Import-Operation "op_propertyowner_getownerproperties" "propertyowner-api" "GetOwnerProperties"
Import-Operation "op_propertyowner_getownerlistings" "propertyowner-api" "GetOwnerListings"
Import-Operation "op_propertyowner_createagent" "propertyowner-api" "CreateAgent"
Import-Operation "op_propertyowner_getagentbyid" "propertyowner-api" "GetAgentById"
Import-Operation "op_propertyowner_getowneragents" "propertyowner-api" "GetOwnerAgents"
Import-Operation "op_propertyowner_createcaretaker" "propertyowner-api" "CreateCaretaker"
Import-Operation "op_propertyowner_getcaretakerbyid" "propertyowner-api" "GetCaretakerById"
Import-Operation "op_propertyowner_getownercaretakers" "propertyowner-api" "GetOwnerCaretakers"
Import-Operation "op_propertyowner_getownersportaldirectory" "propertyowner-api" "GetOwnersPortalDirectory"
Import-Operation "op_propertyowner_getowners" "propertyowner-api" "GetOwners"

# --- Property API Operations ---
Import-Operation "op_property_createtenantapplication" "property-api" "CreateTenantApplication"
Import-Operation "op_property_gettenantapplication" "property-api" "GetTenantApplication"
Import-Operation "op_property_getapplicationsbycustomer" "property-api" "GetApplicationsByCustomer"
Import-Operation "op_property_getapplicationsbylisting" "property-api" "GetApplicationsByListing"
Import-Operation "op_property_getapplicationsbyowner" "property-api" "GetApplicationsByOwner"
Import-Operation "op_property_addapplicationdocument" "property-api" "AddApplicationDocument"
Import-Operation "op_property_submitapplicationforreview" "property-api" "SubmitApplicationForReview"
Import-Operation "op_property_reviewapplication" "property-api" "ReviewApplication"
Import-Operation "op_property_acceptapplicationterms" "property-api" "AcceptApplicationTerms"
Import-Operation "op_property_cancelapplication" "property-api" "CancelApplication"
Import-Operation "op_property_createviewingbooking" "property-api" "CreateViewingBooking"
Import-Operation "op_property_getviewingbooking" "property-api" "GetViewingBooking"
Import-Operation "op_property_getbookingsbycustomer" "property-api" "GetBookingsByCustomer"
Import-Operation "op_property_getbookingsbylisting" "property-api" "GetBookingsByListing"
Import-Operation "op_property_getbookingsbyowner" "property-api" "GetBookingsByOwner"
Import-Operation "op_property_confirmviewingbooking" "property-api" "ConfirmViewingBooking"
Import-Operation "op_property_cancelviewingbooking" "property-api" "CancelViewingBooking"
Import-Operation "op_property_completeviewingbooking" "property-api" "CompleteViewingBooking"
Import-Operation "op_property_createlisting" "property-api" "CreateListing"
Import-Operation "op_property_createlistingfromproperty" "property-api" "CreateListingFromProperty"
Import-Operation "op_property_getlistingbyid" "property-api" "GetListingById"
Import-Operation "op_property_getlistingbycode" "property-api" "GetListingByCode"
Import-Operation "op_property_getalllistings" "property-api" "GetAllListings"
Import-Operation "op_property_getlistingsbyproperty" "property-api" "GetListingsByProperty"
Import-Operation "op_property_getlistingsbyowner" "property-api" "GetListingsByOwner"
Import-Operation "op_property_getlistingsbycity" "property-api" "GetListingsByCity"
Import-Operation "op_property_getlistingsbycounty" "property-api" "GetListingsByCounty"
Import-Operation "op_property_getlistingsbylocation" "property-api" "GetListingsByLocation"
Import-Operation "op_property_getlistingsbytype" "property-api" "GetListingsByType"
Import-Operation "op_property_getlistingsbylistingtype" "property-api" "GetListingsByListingType"
Import-Operation "op_property_getfeaturedlistings" "property-api" "GetFeaturedListings"
Import-Operation "op_property_getavailablelistings" "property-api" "GetAvailableListings"
Import-Operation "op_property_searchlistings" "property-api" "SearchListings"
Import-Operation "op_property_updatelisting" "property-api" "UpdateListing"
Import-Operation "op_property_regeneratelistingembedding" "property-api" "RegenerateListingEmbedding"
Import-Operation "op_property_updatelistingavailability" "property-api" "UpdateListingAvailability"
Import-Operation "op_property_updatelistingrating" "property-api" "UpdateListingRating"
Import-Operation "op_property_incrementlistingviews" "property-api" "IncrementListingViews"
Import-Operation "op_property_updatelistingfeatured" "property-api" "UpdateListingFeatured"
Import-Operation "op_property_assignlistingagent" "property-api" "AssignListingAgent"
Import-Operation "op_property_removelistingagent" "property-api" "RemoveListingAgent"
Import-Operation "op_property_assignlistingcaretaker" "property-api" "AssignListingCaretaker"
Import-Operation "op_property_removelistingcaretaker" "property-api" "RemoveListingCaretaker"
Import-Operation "op_property_deletelisting" "property-api" "DeleteListing"
Import-Operation "op_property_getonboardinginfo" "property-api" "GetOnboardingInfo"
Import-Operation "op_property_createproperty" "property-api" "CreateProperty"
Import-Operation "op_property_getpropertybyid" "property-api" "GetPropertyById"
Import-Operation "op_property_getpropertybycode" "property-api" "GetPropertyByCode"
Import-Operation "op_property_getallproperties" "property-api" "GetAllProperties"
Import-Operation "op_property_getpropertiesbyowner" "property-api" "GetPropertiesByOwner"
Import-Operation "op_property_updateproperty" "property-api" "UpdateProperty"
Import-Operation "op_property_deleteproperty" "property-api" "DeleteProperty"
Import-Operation "op_property_createpropertyterms" "property-api" "CreatePropertyTerms"
Import-Operation "op_property_updatepropertyterms" "property-api" "UpdatePropertyTerms"
Import-Operation "op_property_getlistingterms" "property-api" "GetListingTerms"
Import-Operation "op_property_gettermsbyid" "property-api" "GetTermsById"
Import-Operation "op_property_deletepropertyterms" "property-api" "DeletePropertyTerms"
Import-Operation "op_property_getpresigneduploadurl" "property-api" "GetPresignedUploadUrl"
Import-Operation "op_property_uploadfile" "property-api" "UploadFile"
Import-Operation "op_property_getpublicurl" "property-api" "GetPublicUrl"

# --- Customer API Operations ---
Import-Operation "op_customer_createcustomer" "customer-api" "CreateCustomer"
Import-Operation "op_customer_getcustomers" "customer-api" "GetCustomers"
Import-Operation "op_customer_getcustomerbyid" "customer-api" "GetCustomerById"
Import-Operation "op_customer_getcustomerbyphone" "customer-api" "GetCustomerByPhone"
Import-Operation "op_customer_getcustomersbyregion" "customer-api" "GetCustomersByRegion"
Import-Operation "op_customer_getcustomersbyowner" "customer-api" "GetCustomersByOwner"
Import-Operation "op_customer_getcustomersbyproperty" "customer-api" "GetCustomersByProperty"
Import-Operation "op_customer_getcustomersbylisting" "customer-api" "GetCustomersByListing"
Import-Operation "op_customer_updatecustomer" "customer-api" "UpdateCustomer"
Import-Operation "op_customer_deactivatecustomer" "customer-api" "DeactivateCustomer"
Import-Operation "op_customer_attachcustomerproperty" "customer-api" "AttachCustomerProperty"
Import-Operation "op_customer_getcustomerproperties" "customer-api" "GetCustomerProperties"
Import-Operation "op_customer_addcustomerdocument" "customer-api" "AddCustomerDocument"
Import-Operation "op_customer_getcustomerdocuments" "customer-api" "GetCustomerDocuments"

# --- Static Data API Operations ---
Import-Operation "op_staticdata_getcategories" "staticdata-api" "GetCategories"
Import-Operation "op_staticdata_getusertypes" "staticdata-api" "GetUserTypes"
Import-Operation "op_staticdata_getuserroles" "staticdata-api" "GetUserRoles"
Import-Operation "op_staticdata_createuserrole" "staticdata-api" "CreateUserRole"
Import-Operation "op_staticdata_createusertype" "staticdata-api" "CreateUserType"
Import-Operation "op_staticdata_getallcategories" "staticdata-api" "GetAllCategories"
Import-Operation "op_staticdata_getcategorybyid" "staticdata-api" "GetCategoryById"
Import-Operation "op_staticdata_getcategoriesbycity" "staticdata-api" "GetCategoriesByCity"
Import-Operation "op_staticdata_getcategoriesbycountry" "staticdata-api" "GetCategoriesByCountry"
Import-Operation "op_staticdata_createcategory" "staticdata-api" "CreateCategory"
Import-Operation "op_staticdata_updatecategory" "staticdata-api" "UpdateCategory"
Import-Operation "op_staticdata_deletecategory" "staticdata-api" "DeleteCategory"
Import-Operation "op_staticdata_getsubcategories" "staticdata-api" "GetSubcategories"
Import-Operation "op_staticdata_getallsubcategories" "staticdata-api" "GetAllSubcategories"
Import-Operation "op_staticdata_getsubcategorybyid" "staticdata-api" "GetSubcategoryById"
Import-Operation "op_staticdata_getsubcategoriesbycategory" "staticdata-api" "GetSubcategoriesByCategory"
Import-Operation "op_staticdata_getsubcategoriesbycity" "staticdata-api" "GetSubcategoriesByCity"
Import-Operation "op_staticdata_getsubcategoriesbycountry" "staticdata-api" "GetSubcategoriesByCountry"
Import-Operation "op_staticdata_createsubcategory" "staticdata-api" "CreateSubcategory"
Import-Operation "op_staticdata_updatesubcategory" "staticdata-api" "UpdateSubcategory"
Import-Operation "op_staticdata_deletesubcategory" "staticdata-api" "DeleteSubcategory"

# --- AI Agent API Operations ---
Import-Operation "op_aiagent_agentchat" "aiagent-api" "AgentChat"
Import-Operation "op_aiagent_agentrespondandrecommend" "aiagent-api" "AgentRespondAndRecommend"
Import-Operation "op_aiagent_agentknowledgestatus" "aiagent-api" "AgentKnowledgeStatus"
Import-Operation "op_aiagent_agentsearchlistings" "aiagent-api" "AgentSearchListings"
Import-Operation "op_aiagent_agenthealth" "aiagent-api" "AgentHealth"

# --- Payments API Operations ---
Import-Operation "op_payments_registerc2burls" "payments-api" "RegisterC2bUrls"
Import-Operation "op_payments_c2bvalidate" "payments-api" "C2bValidate"
Import-Operation "op_payments_c2bconfirm" "payments-api" "C2bConfirm"
Import-Operation "op_payments_getpayment" "payments-api" "GetPayment"
Import-Operation "op_payments_getpaymentsbyapplication" "payments-api" "GetPaymentsByApplication"
Import-Operation "op_payments_getunmatchedpayments" "payments-api" "GetUnmatchedPayments"
Import-Operation "op_payments_manualconfirmpayment" "payments-api" "ManualConfirmPayment"
Import-Operation "op_payments_matchpaymenttoapplication" "payments-api" "MatchPaymentToApplication"
Import-Operation "op_payments_initiatestkpush" "payments-api" "InitiateStkPush"
Import-Operation "op_payments_stkpushcallback" "payments-api" "StkPushCallback"
Import-Operation "op_payments_querystkstatus" "payments-api" "QueryStkStatus"

# --- Logging API Operations ---
Import-Operation "op_logging_writelog" "logging-api" "WriteLog"
Import-Operation "op_logging_readlog" "logging-api" "ReadLog"

Write-Host "Import process completed successfully."
exit 0
