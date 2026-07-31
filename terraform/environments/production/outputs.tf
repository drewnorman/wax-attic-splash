output "firebase_hosting_site_id" {
  value = google_firebase_hosting_site.production.site_id
}

output "firebase_hosting_default_url" {
  value = "https://${google_firebase_hosting_site.production.site_id}.web.app"
}

output "manual_dns_subdomain_a_record" {
  description = "Expected A record target for the external DNS owner. Use the exact record requested by Firebase Hosting during custom-domain setup."
  value = {
    name  = var.production_domain
    type  = "A"
    value = local.firebase_hosting_reserved_ip
  }
}

output "manual_dns_ownership_txt_record" {
  description = "TXT record for the external DNS owner if Firebase requests site ownership verification."
  value = {
    name  = var.production_domain
    type  = "TXT"
    value = "hosting-site=${google_firebase_hosting_site.production.site_id}"
  }
}
