variable "vercel_project_name" {
  description = "Name of the Vercel project"
  type        = string
  default     = "mikazuki-munechika"
}

variable "vercel_api_token" {
  description = "API token for the Vercel project"
  type        = string
  sensitive   = true
}
