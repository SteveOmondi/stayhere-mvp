#
# APIM Security Map — StayHere MVP
# ─────────────────────────────────────────────────────────────────────────────
# Defines which APIM operations require JWT validation and which are public.
#
# FORMAT:
#   Each entry is a pattern that matches against "<HTTP_METHOD>:<URL_PATH>".
#   Patterns are evaluated TOP-DOWN — most specific rules must come first.
#   Wildcards: * matches any segment, ** matches any path suffix.
#
# VALUES:
#   "public"       — No JWT policy applied. Anyone can call.
#   "requires-jwt" — JWT validate-jwt policy injected at the operation level.
#
# DEFAULT (no match): "requires-jwt"
# ─────────────────────────────────────────────────────────────────────────────

@{
    Rules = [ordered]@{

        # ── AI Agent ──────────────────────────────────────────────────────────
        "GET:health"                                        = "public"
        "GET:listings"                                      = "public"          # AI search listings
        "POST:chat"                                         = "requires-jwt"
        "POST:respondandrecommend"                          = "requires-jwt"
        "GET:knowledge/status"                              = "requires-jwt"

        # ── Auth ──────────────────────────────────────────────────────────────
        "POST:login"                                        = "public"
        "POST:signup"                                       = "public"
        "POST:verifyotp"                                    = "public"
        "POST:onboard"                                      = "requires-jwt"
        "GET:profiles/*"                                    = "requires-jwt"

        # ── Properties ────────────────────────────────────────────────────────
        "GET:properties"                                    = "public"
        "GET:properties/*"                                  = "public"
        "GET:properties/code/*"                             = "public"
        "GET:properties/owner/*"                            = "requires-jwt"
        "POST:properties"                                   = "requires-jwt"
        "PUT:properties/*"                                  = "requires-jwt"
        "DELETE:properties/*"                               = "requires-jwt"

        # ── Listings ──────────────────────────────────────────────────────────
        "GET:listings/featured"                             = "public"
        "GET:listings/available"                            = "public"
        "GET:listings/by-location"                          = "public"
        "GET:listings/code/*"                               = "public"
        "GET:listings/city/*"                               = "public"
        "GET:listings/county/*"                             = "public"
        "GET:listings/type/*"                               = "public"
        "GET:listings/listing-type/*"                       = "public"
        "GET:listings/search"                               = "public"
        "GET:listings/*"                                    = "public"          # get-by-id
        "GET:listings"                                      = "public"          # get-all
        "GET:listings/from-property/*"                      = "public"
        "GET:listings/owner/*"                              = "requires-jwt"
        "POST:listings"                                     = "requires-jwt"
        "POST:listings/search"                              = "public"
        "POST:properties/*/listings"                        = "requires-jwt"
        "PUT:listings/*"                                    = "requires-jwt"
        "PATCH:listings/*/availability"                     = "requires-jwt"
        "PATCH:listings/*/rating"                           = "public"          # ratings are public writes
        "PATCH:listings/*/featured"                         = "requires-jwt"
        "POST:listings/*/view"                              = "public"
        "POST:listings/*/agent"                             = "requires-jwt"
        "DELETE:listings/*/agent"                           = "requires-jwt"
        "POST:listings/*/caretaker"                         = "requires-jwt"
        "DELETE:listings/*/caretaker"                       = "requires-jwt"
        "DELETE:listings/*"                                 = "requires-jwt"
        "POST:listings/*/embedding"                         = "requires-jwt"

        # ── Customers ─────────────────────────────────────────────────────────
        "POST:customers"                                    = "requires-jwt"
        "GET:customers/list"                                = "requires-jwt"
        "GET:customers/*"                                   = "requires-jwt"
        "GET:customers/by-phone/*"                          = "requires-jwt"
        "GET:customers/profile"                             = "requires-jwt"
        "PUT:customers/*"                                   = "requires-jwt"
        "POST:customers/*/deactivate"                       = "requires-jwt"
        "POST:customers/*/properties"                       = "requires-jwt"
        "GET:customers/*/properties"                        = "requires-jwt"
        "POST:customers/*/documents"                        = "requires-jwt"
        "GET:customers/*/documents"                         = "requires-jwt"
        "GET:listings/*/customers"                          = "requires-jwt"

        # ── Property Owners ───────────────────────────────────────────────────
        "POST:owners"                                       = "requires-jwt"
        "GET:owners"                                        = "requires-jwt"
        "GET:owners/portal-directory"                       = "requires-jwt"
        "GET:owners/user/*"                                 = "requires-jwt"
        "GET:owners/email/*"                                = "requires-jwt"
        "GET:owners/*"                                      = "requires-jwt"
        "PUT:owners/*"                                      = "requires-jwt"
        "GET:owners/*/wallet"                               = "requires-jwt"
        "GET:owners/*/properties"                           = "requires-jwt"
        "GET:owners/*/listings"                             = "requires-jwt"
        "GET:owners/*/agents"                               = "requires-jwt"
        "POST:owners/*/agents"                              = "requires-jwt"
        "GET:agents/*"                                      = "requires-jwt"
        "GET:owners/*/caretakers"                           = "requires-jwt"
        "POST:owners/*/caretakers"                          = "requires-jwt"
        "GET:caretakers/*"                                  = "requires-jwt"

        # ── Static Data ───────────────────────────────────────────────────────
        "GET:categories"                                    = "public"
        "GET:categories/all"                                = "requires-jwt"
        "GET:categories/*"                                  = "public"
        "GET:categories/city/*"                             = "public"
        "GET:categories/country/*"                          = "public"
        "POST:categories"                                   = "requires-jwt"
        "PUT:categories/*"                                  = "requires-jwt"
        "DELETE:categories/*"                               = "requires-jwt"
        "GET:user-types"                                    = "public"
        "GET:user-roles"                                    = "public"
    }
}
