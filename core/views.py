from django.contrib import messages
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.shortcuts import redirect, render

# Package pricing mapping
PACKAGES = {
    'Maldives Overwater Escape': {'price': 185000, 'currency': '₹'},
    'Goa Beach Escape': {'price': 25000, 'currency': '₹'},
    'Himalayan Adventure': {'price': 40000, 'currency': '₹'},
    'Rajasthan Heritage Tour': {'price': 55000, 'currency': '₹'},
    'Kerala Backwater & Wildlife': {'price': 38000, 'currency': '₹'},
    'Sikkim Serenity': {'price': 32000, 'currency': '₹'},
}

def index(request):
    return render(request, 'core/index.html')

def login(request):
    if request.user.is_authenticated:
        return redirect('index')

    if request.method == 'POST':
        email = request.POST.get('email', '').strip().lower()
        password = request.POST.get('password', '')

        user = authenticate(request, username=email, password=password)
        if user is not None:
            auth_login(request, user)
            return redirect('index')

        messages.error(request, 'Invalid email or password.')
        return render(request, 'core/login.html', {'email': email})

    return render(request, 'core/login.html')

def signup(request):
    if request.user.is_authenticated:
        return redirect('index')

    if request.method == 'POST':
        full_name = request.POST.get('full_name', '').strip()
        email = request.POST.get('email', '').strip().lower()
        password = request.POST.get('password', '')
        confirm_password = request.POST.get('confirm_password', '')

        if not full_name or not email or not password or not confirm_password:
            messages.error(request, 'Please fill in all fields.')
            return render(request, 'core/signup.html', {'full_name': full_name, 'email': email})

        if password != confirm_password:
            messages.error(request, 'Passwords do not match.')
            return render(request, 'core/signup.html', {'full_name': full_name, 'email': email})

        if User.objects.filter(username=email).exists():
            messages.error(request, 'A user with this email already exists.')
            return render(request, 'core/signup.html', {'full_name': full_name, 'email': email})

        user = User.objects.create_user(username=email, email=email, password=password, first_name=full_name)
        auth_login(request, user)
        messages.success(request, 'Signup successful. Welcome!')
        return redirect('index')

    return render(request, 'core/signup.html')

@login_required(login_url='login')
def booking(request):
    # Get package from URL parameter
    package_name = request.GET.get('package')
    
    if package_name:
        # Validate package exists
        if package_name in PACKAGES:
            package_info = PACKAGES[package_name]
            request.session['selected_package'] = package_name
            request.session['selected_package_price'] = package_info['price']
            context = {
                'selected_package': package_name,
                'package_price': package_info['price'],
                'currency': package_info['currency']
            }
        else:
            messages.error(request, 'Invalid package selected.')
            return redirect('packages')
    else:
        # Check if package exists in session
        selected_package = request.session.get('selected_package')
        selected_price = request.session.get('selected_package_price')
        if not selected_package:
            messages.error(request, 'Please select a package first.')
            return redirect('packages')
        context = {
            'selected_package': selected_package,
            'package_price': selected_price,
            'currency': '₹'
        }
    
    return render(request, 'core/booking.html', context)

@login_required(login_url='login')
def payment(request):
    # Get package price from session
    selected_package = request.session.get('selected_package')
    package_price = request.session.get('selected_package_price')
    
    if not selected_package or not package_price:
        messages.error(request, 'Please complete your booking first.')
        return redirect('booking')
    
    context = {
        'selected_package': selected_package,
        'package_price': package_price,
        'currency': '₹'
    }
    
    return render(request, 'core/payment_page.html', context)


def logout_view(request):
    auth_logout(request)
    messages.info(request, 'You have been logged out.')
    return redirect('login')

def destination(request):
    return render(request, 'core/destination.html')

def packages(request):
    return render(request, 'core/packages.html')