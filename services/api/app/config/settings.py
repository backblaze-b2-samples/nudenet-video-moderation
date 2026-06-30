from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Backblaze B2 (S3-compatible) — Standard #3 env var names ---
    # The S3 endpoint is DERIVED from the region so there is a single source of
    # truth and the boto3 client can be handed an explicit region for correct
    # S3v4 signing. No region string is ever hardcoded in source.
    b2_application_key_id: str = ""
    b2_application_key: str = ""
    b2_bucket_name: str = ""
    b2_region: str = "us-west-004"
    b2_public_url_base: str = ""

    api_port: int = 8000
    # Explicit allowlist by default — covers Next on :3000 and the
    # fallback :3001 it picks if 3000 is busy. Production deploys should
    # override with the exact frontend origin.
    api_cors_origins: str = "http://localhost:3000,http://localhost:3001"
    # Optional dev-only escape hatch: a regex that matches additional
    # allowed origins. Empty by default — set this to e.g.
    # `^http://localhost:\d+$` to accept any localhost port without
    # listing each one. NEVER ship this to production.
    api_cors_origin_regex: str = ""

    # --- Moderation pipeline defaults (env-configurable) ---
    # Detection confidence floor. A frame is flagged only when a detection
    # scores >= this AND its class is in VIOLATION_LABELS.
    moderation_threshold: float = 0.25
    # Frame sampling strategy: "fps" (uniform sampling) or "keyframes".
    sample_mode: str = "fps"
    # Frames per second to sample when sample_mode == "fps".
    sample_fps: float = 1.0
    # Comma-separated NudeNet classes that constitute a policy violation.
    # Env-configurable so a platform can tune its policy without code changes.
    # All other detected classes (FACE_*, FEET_*, BELLY_*, ARMPITS_*) are
    # recorded for transparency but do NOT flag a frame.
    violation_labels: str = (
        "FEMALE_GENITALIA_EXPOSED,MALE_GENITALIA_EXPOSED,"
        "FEMALE_BREAST_EXPOSED,BUTTOCKS_EXPOSED,ANUS_EXPOSED"
    )
    # Hard cap on uploaded video size.
    max_video_size: int = 500 * 1024 * 1024  # 500MB

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",")]

    @property
    def b2_endpoint(self) -> str:
        """Derive the S3-compatible endpoint from the configured region."""
        return f"https://s3.{self.b2_region}.backblazeb2.com"

    @property
    def violation_label_set(self) -> set[str]:
        return {
            label.strip().upper()
            for label in self.violation_labels.split(",")
            if label.strip()
        }


settings = Settings()
