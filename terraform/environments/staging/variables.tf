variable "project_id" {
  type    = string
  default = "wax-attic"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "firebase_hosting_site_id" {
  type        = string
  default     = "wax-attic-staging"
  description = "Firebase Hosting site ID for staging."
}

variable "staging_dns_name" {
  type        = string
  default     = "staging"
  description = "Cloudflare DNS record name for staging."
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_zone_id" {
  type = string
}
