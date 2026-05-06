from django.db import models
from django.contrib.auth.models import User

class Booking(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    package_name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=100, unique=True)
    payment_method = models.CharField(max_length=50, default='Online')
    booking_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='confirmed')
    
    def __str__(self):
        return f"Booking {self.transaction_id} - {self.package_name}"
    
    class Meta:
        ordering = ['-booking_date']
