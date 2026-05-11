from django.contrib import messages
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .models import Booking

# Package pricing mapping
PACKAGES = {
    'Maldives Overwater Escape':  {'price': 185000, 'currency': '₹', 'duration': 9, 'pax': 2},
    'Goa Beach Escape':           {'price': 25000,  'currency': '₹', 'duration': 5, 'pax': 2},
    'Himalayan Adventure':        {'price': 40000,  'currency': '₹', 'duration': 7, 'pax': 4},
    'Rajasthan Heritage Tour':    {'price': 55000,  'currency': '₹', 'duration': 8, 'pax': 2},
    'Kerala Backwater & Wildlife':{'price': 38000,  'currency': '₹', 'duration': 6, 'pax': 2},
    'Sikkim Serenity':            {'price': 32000,  'currency': '₹', 'duration': 7, 'pax': 2},
}

# Package images mapping
PACKAGE_IMAGES = {
    'Maldives Overwater Escape': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
    'Goa Beach Escape': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600',
    'Himalayan Adventure': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600',
    'Rajasthan Heritage Tour': 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600',
    'Kerala Backwater & Wildlife': 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=600',
    'Sikkim Serenity': 'https://images.unsplash.com/photo-1544008230-ac1e1fb4f4f4?w=600',
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
    if request.method == 'POST':
        traveler_name = request.POST.get('fullname', '').strip()
        phone         = request.POST.get('phone', '').strip()
        fixed_adults  = int(request.POST.get('adults', 1) or 1)
        add_adults    = int(request.POST.get('add_adult', 0) or 0)
        children      = int(request.POST.get('children', 0) or 0)
        total_adults  = fixed_adults + add_adults
        num_persons   = total_adults + children
        departure_date = request.POST.get('start_date', '')
        return_date = request.POST.get('end_date', '')

        if traveler_name:
            request.session['traveler_name'] = traveler_name
        if phone:
            request.session['phone']         = phone
        request.session['num_adults']        = total_adults
        request.session['num_add_adults']    = add_adults
        request.session['num_children']      = children
        request.session['num_persons']       = num_persons
        request.session['package_pax']       = fixed_adults
        request.session['departure_date']    = departure_date
        request.session['return_date']       = return_date
        return redirect('payment')

    # Get package from URL parameter
    package_name = request.GET.get('package')
    if package_name:
        package_name = package_name.strip()

    if package_name:
        if package_name in PACKAGES:
            package_info = PACKAGES[package_name]
            request.session['selected_package']       = package_name
            request.session['selected_package_price'] = package_info['price']
            request.session['package_pax']            = package_info['pax']
            context = {
                'selected_package':  package_name,
                'package_price':     package_info['price'],
                'currency':          package_info['currency'],
                'package_duration':  package_info['duration'],
                'package_pax':       package_info['pax'],
            }
        else:
            messages.error(request, 'Invalid package selected.')
            return redirect('packages')
    else:
        selected_package = request.session.get('selected_package')
        selected_price   = request.session.get('selected_package_price')
        if not selected_package:
            messages.error(request, 'Please select a package first.')
            return redirect('packages')
        # Restore duration & pax from PACKAGES dict for session-based flow
        pkg_info = PACKAGES.get(selected_package, {})
        request.session['package_pax'] = request.session.get('package_pax', pkg_info.get('pax', 1))
        context = {
            'selected_package':  selected_package,
            'package_price':     selected_price,
            'currency':          '₹',
            'package_duration':  pkg_info.get('duration', ''),
            'package_pax':       request.session['package_pax'],
        }

    return render(request, 'core/booking.html', context)

@login_required(login_url='login')
def payment(request):
    selected_package = request.session.get('selected_package')
    package_price    = request.session.get('selected_package_price')
    package_adults   = request.session.get('package_pax', 1)
    added_adults     = request.session.get('num_add_adults', 0)
    num_children     = request.session.get('num_children', 0)
    num_adults       = request.session.get('num_adults', package_adults + added_adults)
    num_persons      = num_adults + num_children

    if not selected_package or not package_price:
        messages.error(request, 'Please complete your booking first.')
        return redirect('booking')

    adult_rate   = round(package_price / 2)
    child_rate   = round(package_price / 4)
    total_amount = (package_price * package_adults) + (adult_rate * added_adults) + (child_rate * num_children)

    context = {
        'selected_package': selected_package,
        'package_price':    total_amount,
        'base_price':       package_price,
        'package_adults':   package_adults,
        'added_adults':     added_adults,
        'num_persons':      num_persons,
        'num_adults':       num_adults,
        'num_children':     num_children,
        'currency':         '₹'
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

@login_required(login_url='login')
def dashboard(request):
    bookings = Booking.objects.filter(user=request.user).order_by('-booking_date')
    confirmed_count = bookings.filter(status='confirmed').count()
    upcoming_count  = bookings.filter(status='confirmed').count()
    next_booking    = bookings.first() if bookings.exists() else None

    default_image = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600'
    for booking in bookings:
        package_key      = booking.package_name.strip() if booking.package_name else ''
        booking.image_url = PACKAGE_IMAGES.get(package_key, default_image)

    context = {
        'bookings':        bookings,
        'confirmed_count': confirmed_count,
        'upcoming_count':  upcoming_count,
        'next_booking':    next_booking,
    }
    return render(request, 'core/dashboard.html', context)

@login_required(login_url='login')
def booking_confirmation(request, txn_id):
    booking = Booking.objects.filter(transaction_id=txn_id, user=request.user).first()

    if not booking:
        messages.error(request, 'Booking not found.')
        return redirect('dashboard')

    context = {'booking': booking}
    return render(request, 'core/booking_confirmation.html', context)

@csrf_exempt
@login_required(login_url='login')
@require_http_methods(["POST"])
def create_booking(request):
    """API endpoint to create a booking after successful payment"""
    try:
        data = json.loads(request.body)

        selected_package = request.session.get('selected_package')
        selected_price   = request.session.get('selected_package_price')
        traveler_name    = request.session.get('traveler_name', '')
        phone            = request.session.get('phone', '')
        num_persons      = request.session.get('num_persons', 1)
        num_adults       = request.session.get('num_adults', 1)    # ← get adults
        num_children     = request.session.get('num_children', 0)  # ← get children
        departure_date   = request.session.get('departure_date', '')
        return_date      = request.session.get('return_date', '')

        if not selected_package or not selected_price:
            return JsonResponse({'success': False, 'message': 'Package not found in session'}, status=400)

        selected_package = selected_package.strip()
        default_image    = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600'
        final_amount     = data.get('amount', selected_price * num_persons)

        booking = Booking.objects.create(
            user            = request.user,
            package_name    = selected_package,
            amount          = final_amount,
            transaction_id  = data.get('txn_id'),
            payment_method  = data.get('method', 'Online'),
            status          = 'confirmed',
            traveler_name   = traveler_name,
            phone           = phone,
            image_url       = PACKAGE_IMAGES.get(selected_package, default_image),
            num_persons     = num_persons,
            num_adults      = num_adults,    # ← save adults to DB
            num_children    = num_children,  # ← save children to DB
            departure_date  = departure_date if departure_date else None,
            return_date     = return_date if return_date else None,
        )

        # Clear session
        request.session.pop('selected_package', None)
        request.session.pop('selected_package_price', None)
        request.session.pop('traveler_name', None)
        request.session.pop('phone', None)
        request.session.pop('num_persons', None)
        request.session.pop('num_adults', None)
        request.session.pop('num_add_adults', None)
        request.session.pop('num_children', None)
        request.session.pop('package_pax', None)
        request.session.pop('departure_date', None)
        request.session.pop('return_date', None)

        return JsonResponse({'success': True, 'booking_id': booking.id}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)