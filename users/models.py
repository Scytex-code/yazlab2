from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class CustomUserManager(UserManager):
    pass 


class CustomUser(AbstractUser):
    objects = CustomUserManager() 
    
    first_name = models.CharField(max_length=150, blank=True, null=True)
    last_name = models.CharField(max_length=150, blank=True, null=True)
    
    bio = models.TextField(blank=True, null=True)
    avatar_url = models.URLField(max_length=200, blank=True, null=True) 

    def __str__(self):
        return self.username