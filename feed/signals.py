from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from content.models import Rating, Review, ListItem, UserList
from .models import Activity, Follow 
from users.models import CustomUser


@receiver(post_save, sender=Rating)
def record_rating_activity(sender, instance, created, **kwargs):
    if created:
        Activity.objects.create(
            user=instance.user,
            activity_type=1,
            content_type=ContentType.objects.get_for_model(sender),
            object_id=instance.id
        )


@receiver(post_save, sender=Review)
def record_review_activity(sender, instance, created, **kwargs):
    if created:
        Activity.objects.create(
            user=instance.user,
            activity_type=2, 
            content_type=ContentType.objects.get_for_model(sender),
            object_id=instance.id
        )


@receiver(post_save, sender=ListItem)
def record_list_item_activity(sender, instance, created, **kwargs):
    if created:
        Activity.objects.create(
            user=instance.list.user, 
            activity_type=3,
            content_type=ContentType.objects.get_for_model(sender),
            object_id=instance.id
        )


@receiver(post_save, sender=Follow)
def record_follow_activity(sender, instance, created, **kwargs):
    if created:
        Activity.objects.create(
            user=instance.follower, 
            activity_type=4,
            content_type=ContentType.objects.get_for_model(sender),
            object_id=instance.id
        )


@receiver(post_save, sender=CustomUser)
def create_initial_lists(sender, instance, created, **kwargs):
    if created:
        list_names = [
            "İzleyeceklerim",
            "Okuduklarım",
            "Favorilerim",
        ]
        
        lists_to_create = []
        for name in list_names:
            lists_to_create.append(
                UserList(
                    user=instance,
                    name=name,
                    is_predefined=True
                )
            )
        UserList.objects.bulk_create(lists_to_create)

        print(f"DEBUG: {instance.username} kullanıcısı için başlangıç listeleri oluşturuldu.")


@receiver(post_delete, sender=Rating)
@receiver(post_delete, sender=Review)
@receiver(post_delete, sender=ListItem)
@receiver(post_delete, sender=Follow)
def delete_activity_record(sender, instance, **kwargs):
    try:
        content_type = ContentType.objects.get_for_model(sender)
        Activity.objects.filter(
            content_type=content_type,
            object_id=instance.id
        ).delete()
    except Activity.DoesNotExist:
        pass