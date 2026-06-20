output "firebase_hosting_site_id" {
  value = google_firebase_hosting_site.production.site_id
}

output "firebase_hosting_default_url" {
  value = "https://${google_firebase_hosting_site.production.site_id}.web.app"
}

output "manual_dns_apex_a_record" {
  description = "A record target for the external DNS owner if the production domain is delegated to Firebase Hosting."
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
