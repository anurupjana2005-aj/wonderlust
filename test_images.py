import urllib.request

urls = {
    'Himalayan Adventure': 'https://images.unsplash.com/photo-1464822759844-d150f39b8b3c?w=600',
    'Sikkim Serenity': 'https://images.unsplash.com/photo-1544008230-ac1e1fb4f4f4?w=600',
}

for pkg, url in urls.items():
    try:
        response = urllib.request.urlopen(url, timeout=5)
        print(f"✓ {pkg}: {response.status} - Image accessible")
    except Exception as e:
        print(f"✗ {pkg}: {str(e)}")
