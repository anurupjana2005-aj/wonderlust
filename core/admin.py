from django.contrib import admin
from .models import Booking

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'user', 'package_name', 'amount', 'status', 'booking_date')
    list_filter = ('status', 'booking_date', 'payment_method')
    search_fields = ('transaction_id', 'user__email', 'package_name')
    readonly_fields = ('transaction_id', 'booking_date')
    
    fieldsets = (
        ('User Information', {'fields': ('user',)}),
        ('Package Information', {'fields': ('package_name', 'amount')}),
        ('Payment Information', {'fields': ('transaction_id', 'payment_method', 'status')}),
        ('Booking Date', {'fields': ('booking_date',)}),
    )
