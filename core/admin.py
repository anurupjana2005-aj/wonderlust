from django.contrib import admin
from django.utils import timezone
from .models import Booking

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'transaction_id', 'traveler_name', 'phone',
        'package_name', 'num_adults', 'num_children', 'num_persons',
        'departure_date', 'return_date', 'amount', 'payment_method', 'status', 'get_ist_time'
    )
    list_filter = ('status', 'booking_date', 'payment_method')
    search_fields = ('transaction_id', 'user__email', 'package_name', 'traveler_name', 'phone')
    readonly_fields = ('transaction_id', 'booking_date', 'get_ist_time')

    def get_ist_time(self, obj):
        local_time = timezone.localtime(obj.booking_date)
        return local_time.strftime('%d %b %Y, %I:%M %p')

    get_ist_time.short_description = 'Booking Time (IST)'

    fieldsets = (
        ('User Information', {
            'fields': ('user', 'traveler_name', 'phone')
        }),
        ('Package Information', {
            'fields': ('package_name', 'num_adults', 'num_children', 'num_persons', 'amount')
        }),
        ('Trip Dates', {
            'fields': ('departure_date', 'return_date')
        }),
        ('Payment Information', {
            'fields': ('transaction_id', 'payment_method', 'status')
        }),
        ('Booking Date', {
            'fields': ('booking_date', 'get_ist_time')
        }),
    )