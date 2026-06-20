output "firebase_hosting_site_id" {
  value = google_firebase_hosting_site.production.site_id
}

output "firebase_hosting_default_url" {
  value = "https://${google_firebase_hosting_site.production.site_id}.web.app"
}

output "firebase_hosting_dns_record" {
  value = cloudflare_record.production_apex.hostname
}
