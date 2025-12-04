from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from users.models import CustomUser

class Follow(models.Model):
    follower = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='following' 
    )

    following = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='followers'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"
    

class Activity(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='activities') 
    created_at = models.DateTimeField(auto_now_add=True)

    ACTIVITY_TYPES = (
        (1, 'Rating'),
        (2, 'Review'),
        (3, 'List_Add'),
        (4, 'Follow'),
    )
    activity_type = models.PositiveSmallIntegerField(choices=ACTIVITY_TYPES)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Activities"
        
    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()} on {self.created_at.strftime('%Y-%m-%d %H:%M')}"