import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wanderlust.settings')
django.setup()

from core.models import Booking
from core.views import PACKAGE_IMAGES

default_image = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600'
updated_count = 0

print("Starting backfill of booking images...\n")

for booking in Booking.objects.all():
    package_key = booking.package_name.strip() if booking.package_name else ''
    correct_image = PACKAGE_IMAGES.get(package_key, default_image)
    
    if booking.image_url != correct_image:
        booking.image_url = correct_image
        booking.save()
        updated_count += 1
        print(f"✓ Updated: {booking.package_name}")

print(f"\nTotal bookings updated: {updated_count}")
print("\nAll bookings after update:")
for b in Booking.objects.all():
    print(f"  {b.package_name}: {b.image_url}")
