output "firebase_hosting_site_id" {
  value = google_firebase_hosting_site.staging.site_id
}

output "firebase_hosting_default_url" {
  value = "https://${google_firebase_hosting_site.staging.site_id}.web.app"
}

output "manual_dns_cname_target" {
  description = "Optional DNS target for a staging CNAME managed outside this Terraform stack."
  value       = "${google_firebase_hosting_site.staging.site_id}.web.app"
}
