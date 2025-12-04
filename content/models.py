from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation # GenericRelation import'u zaten var
from django.contrib.contenttypes.models import ContentType
from users.models import CustomUser

class Book(models.Model):
    google_books_id = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    authors = models.TextField(blank=True)
    description = models.TextField(blank=True)
    page_count = models.IntegerField(null=True, blank=True)
    cover_url = models.URLField(blank=True)

    def __str__(self):
        return self.title
    

class Movie(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    title = models.CharField(max_length=255)
    overview = models.TextField(blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)
    poster_path = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.title
    

class Rating(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='ratings')
    
    # ⭐ YENİ EKLEME: Beğenileri tutan alan
    likes = models.ManyToManyField(CustomUser, related_name='liked_ratings', blank=True)
    
    # ⭐ ZORUNLU EKLEME: Yanıtları çekmek için GenericRelation
    replies = GenericRelation('Reply')
    
    score = models.IntegerField(choices=[(i, i) for i in range(1, 11)])
    created_at = models.DateTimeField(auto_now_add=True)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id') 

    class Meta:
        unique_together = ('user', 'content_type', 'object_id') 
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} rated {self.content_object} with {self.score}/10"
    

class Review(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='reviews')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    likes = models.ManyToManyField(CustomUser, related_name='liked_reviews', blank=True)
    
    # ⭐ ZORUNLU EKLEME: Yanıtları çekmek için GenericRelation
    replies = GenericRelation('Reply')

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id') 

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.user.username} on {self.content_object}"
    

class UserList(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='lists')
    name = models.CharField(max_length=100)
    is_predefined = models.BooleanField(default=False) 
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'name')

    def __str__(self):
        return f"{self.user.username}'s List: {self.name}"
    

class ListItem(models.Model):
    list = models.ForeignKey(UserList, on_delete=models.CASCADE, related_name='items')
    added_at = models.DateTimeField(auto_now_add=True)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id') 

    class Meta:
        unique_together = ('list', 'content_type', 'object_id') 
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.content_object} in {self.list.name}"
    

class Reply(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='replies')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    class Meta:
        ordering = ['created_at']
        verbose_name_plural = "Replies"
        
    def __str__(self):
        return f"Reply by {self.user.username} on {self.content_object}"