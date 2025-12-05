from rest_framework import serializers
from content.models import Rating, Review, Book, Movie, UserList, ListItem, Reply   
from users.models import CustomUser
from feed.models import Follow, Activity 
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.core.exceptions import ValidationError 
from django.contrib.auth import get_user_model
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator as token_generator
from django.db.models import Avg

User = get_user_model() 


class ContentTypeField(serializers.Field):
    def to_internal_value(self, data):
        if data is None or not isinstance(data, str) or data.strip() == '':
            raise serializers.ValidationError("İçerik tipi ('book', 'movie' vb.) zorunludur ve metin olmalıdır.")
            
        try:
            return ContentType.objects.get(model=data.lower())
        except ContentType.DoesNotExist:
            raise serializers.ValidationError(
                f"ContentType '{data}' bulunamadı. Lütfen 'book' veya 'movie' gibi geçerli bir model adı kullanın."
            )

    def to_representation(self, value):
        return value.model


class UserProfileSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 
            'username', 
            'email', 
            'first_name', 
            'last_name', 
            'avatar_url',
            'bio',
            'followers_count',
            'following_count',
        ]
        read_only_fields = ['followers_count', 'following_count']

    def get_followers_count(self, obj):
        return Follow.objects.filter(following=obj).count()

    def get_following_count(self, obj):
        return Follow.objects.filter(follower=obj).count() 


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'avatar_url'] 


class NestedReplySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = Reply
        fields = ['id', 'user', 'text', 'created_at']


class RatingSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True) 
    
    content_type = ContentTypeField(write_only=True) 
    object_id = serializers.IntegerField(write_only=True)
    replies = NestedReplySerializer(many=True, read_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'user', 'score', 'content_type', 'object_id', 'created_at', 'replies']
        read_only_fields = ['id', 'user', 'created_at']

    def create(self, validated_data):
        user = self.context['request'].user 

        score = validated_data.get('score')
        
        if score is None:
            raise serializers.ValidationError({"score": "Puan alanı zorunludur."})

        rating, created = Rating.objects.update_or_create(
            user=user,
            content_type=validated_data['content_type'], 
            object_id=validated_data['object_id'],
            defaults={'score': score}
        )
        return rating


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    
    is_liked = serializers.SerializerMethodField() 
    
    content_type = ContentTypeField(write_only=True)
    object_id = serializers.IntegerField(write_only=True)
    replies = NestedReplySerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'user', 'text', 'likes_count', 'is_liked', 'content_type', 'object_id', 'created_at', 'updated_at', 'replies'] # is_liked eklendi
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(pk=request.user.pk).exists()
        return False

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data.pop('user', None) 
        review = Review.objects.create(user=user, **validated_data)
        return review


class FollowSerializer(serializers.ModelSerializer):
    following_details = UserSerializer(source='following', read_only=True) 

    class Meta:
        model = Follow
        fields = ['id', 'following', 'following_details', 'created_at']
        read_only_fields = ['id', 'created_at', 'following_details']

    def create(self, validated_data):
        follower = self.context['request'].user 
        following = validated_data.get('following') 
        
        follow, created = Follow.objects.get_or_create(
            follower=follower,
            following=following,
            defaults={'following': following}
        )
        
        if not created:
            raise serializers.ValidationError({"following": "Bu kullanıcıyı zaten takip ediyorsunuz."})

        return follow


DEFAULT_AVATAR_URL = 'https://i.pinimg.com/736x/2c/47/d5/2c47d5dd5b532f83bb55c4cd6f5bd1ef.jpg'
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    
    password1 = serializers.CharField(write_only=True, required=False) 

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'password1', 'password2', 'first_name', 'last_name')
        extra_kwargs = {'password': {'write_only': True}}
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Şifreler eşleşmiyor."})
        return data

    def create(self, validated_data):
        validated_data.pop('password1', None) 
        validated_data.pop('password2')
        
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            avatar_url=DEFAULT_AVATAR_URL 
        )
        return user
    
    def save(self, request=None):
        return self.create(self.validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)

    def validate_email(self, value):
        try:
            CustomUser.objects.get(email=value)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Bu e-posta adresine sahip bir kullanıcı bulunamadı.")
        
        return value
    
    def save(self, request=None):
        email = self.validated_data['email']
        form = PasswordResetForm({'email': email})
        
        if form.is_valid():
            form.save(
                request=self.context.get('request'),
                use_https=self.context.get('request').is_secure(),
                email_template_name='registration/password_reset_email.html', 
                subject_template_name='registration/password_reset_subject.txt',
            )
        else:
            raise ValidationError("Şifre sıfırlama formu geçerli değil.")


class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password1 = serializers.CharField(max_length=128, style={'input_type': 'password'})
    new_password2 = serializers.CharField(max_length=128, style={'input_type': 'password'})
    uid = serializers.CharField()
    token = serializers.CharField()
    
    def validate(self, data):
        if data['new_password1'] != data['new_password2']:
            raise serializers.ValidationError({'new_password2': 'Şifreler eşleşmiyor.'})
        return data

    def save(self):
        try:
            uid = force_str(urlsafe_base64_decode(self.validated_data['uid']))
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            user = None

        if user is not None and token_generator.check_token(user, self.validated_data['token']):
            form = SetPasswordForm(user, data={'new_password1': self.validated_data['new_password1'], 'new_password2': self.validated_data['new_password2']})
            if form.is_valid():
                form.save()
            else:
                raise serializers.ValidationError(form.errors)
        else:
            raise serializers.ValidationError('Geçersiz sıfırlama linki veya token.')


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ['id', 'title', 'authors', 'cover_url', 'description', 'publication_year', 'genres_list'] 


class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = ['id', 'title', 'release_date', 'poster_path', 'overview', 'director_name', 'actors_list', 'genres_list']


def _get_content_type_filter(obj):
    return ContentType.objects.get_for_model(obj.__class__)
    
class NestedReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = Review
        fields = ['id', 'user', 'text', 'created_at']


class BookDetailSerializer(serializers.ModelSerializer):
    average_score = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField() 
    user_score = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        fields = '__all__' 


    def get_reviews(self, obj):
        from content.models import Review
        content_type = _get_content_type_filter(obj)
        
        reviews_queryset = Review.objects.filter(
            content_type=content_type, 
            object_id=obj.id
        ).order_by('-created_at')
        
        return NestedReviewSerializer(reviews_queryset, many=True, context=self.context).data


    def get_average_score(self, obj):
        content_type = _get_content_type_filter(obj)
        result = Rating.objects.filter(
            content_type=content_type, 
            object_id=obj.id
        ).aggregate(score__avg=Avg('score'))
        
        return result.get('score__avg')
        
    def get_user_score(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                content_type = _get_content_type_filter(obj)
                user_rating = Rating.objects.get(
                    user=request.user,
                    content_type=content_type,
                    object_id=obj.id
                )
                return user_rating.score
            except Rating.DoesNotExist:
                return None
        return None
        

class MovieDetailSerializer(serializers.ModelSerializer):
    average_score = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField() 
    user_score = serializers.SerializerMethodField()
    
    class Meta:
        model = Movie
        fields = '__all__' 

    def get_reviews(self, obj):
        from content.models import Review
        content_type = _get_content_type_filter(obj)

        reviews_queryset = Review.objects.filter(
            content_type=content_type, 
            object_id=obj.id
        ).order_by('-created_at')
        
        return NestedReviewSerializer(reviews_queryset, many=True, context=self.context).data

    def get_average_score(self, obj):
        content_type = _get_content_type_filter(obj)
        result = Rating.objects.filter(
            content_type=content_type, 
            object_id=obj.id
        ).aggregate(score__avg=Avg('score'))
        
        return result.get('score__avg')
        
    def get_user_score(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                content_type = _get_content_type_filter(obj)
                user_rating = Rating.objects.get(
                    user=request.user,
                    content_type=content_type,
                    object_id=obj.id
                )
                return user_rating.score
            except Rating.DoesNotExist:
                return None
        return None


class ListItemSerializer(serializers.ModelSerializer): 
    content_type = ContentTypeField(required=True) 
    object_id = serializers.IntegerField(required=True) 
    list = serializers.PrimaryKeyRelatedField(
        queryset=UserList.objects.all(), 
        required=True
    )
    
    content_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta: 
        model = ListItem
        fields = ['id', 'list', 'content_type', 'object_id', 'added_at', 'content_details']
        read_only_fields = ['id', 'added_at'] 


    def create(self, validated_data):
        model_fields = {
            'list': validated_data['list'],
            'content_type': validated_data['content_type'],
            'object_id': validated_data['object_id'],
        }
        
        try:
            list_item, created = ListItem.objects.get_or_create(
                **model_fields,
                defaults={} 
            )
            return list_item
        except Exception as e:
            raise serializers.ValidationError({"server_error": f"İçerik listeye eklenirken veritabanı hatası oluştu: {e}"})
            
    def to_representation(self, instance):
        ret = super().to_representation(instance) 
        ret['list'] = instance.list.pk 
        ret['content_details'] = self.get_content_details(instance)
        return ret
    
    def get_content_details(self, obj):
        target_content = obj.content_object
        if not target_content:
            return None
            
        content_model_name = target_content.__class__.__name__.lower() 
        
        if content_model_name == 'book':
            content_data = BookSerializer(target_content).data
        elif content_model_name == 'movie':
            content_data = MovieSerializer(target_content).data
        else:
            return None
            
        content_data['content_type'] = content_model_name.capitalize() 
        
        return content_data


class UserListDetailSerializer(serializers.ModelSerializer):
    items = ListItemSerializer(many=True, read_only=True) 
    
    class Meta:
        model = UserList
        fields = ['id', 'name', 'is_predefined', 'items']


class ActivitySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True) 
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    content_object_details = serializers.SerializerMethodField()
    interaction_id = serializers.SerializerMethodField() 

    class Meta:
        model = Activity
        fields = [
            'id', 'user', 'activity_type', 'activity_type_display', 
            'created_at', 'content_object_details', 'object_id', 
            'interaction_id'
        ]
        
    def get_interaction_id(self, obj):
        if obj.activity_type in [1, 2] and obj.content_object:
            return obj.content_object.pk 
        return None 

    def get_content_object_details(self, obj):
        source_object = obj.content_object
        if not source_object:
            return None

        if obj.activity_type == 1: 
            target_content = source_object.content_object
            if not target_content: return None
            content_type_name = target_content.__class__.__name__

            content_data = BookSerializer(target_content).data if content_type_name == 'Book' else MovieSerializer(target_content).data
            
            request = self.context.get('request')
            is_liked = False
            if request and request.user.is_authenticated:
                if hasattr(source_object, 'likes'):
                    is_liked = source_object.likes.filter(pk=request.user.pk).exists()

            rating_replies = NestedReplySerializer(source_object.replies.all(), many=True, context=self.context).data

            return {
                'content_type': content_type_name,
                'content_data': content_data,
                'score': source_object.score,
                'rating_id': source_object.pk,
                'likes_count': source_object.likes.count() if hasattr(source_object, 'likes') else 0,
                'is_liked': is_liked,
                'replies': rating_replies, 
            }

        elif obj.activity_type == 2:
            review_data = ReviewSerializer(source_object, context=self.context).data

            content_type_name = source_object.content_object.__class__.__name__
            content_data = BookSerializer(source_object.content_object).data if content_type_name == 'Book' else MovieSerializer(source_object.content_object).data
            
            return {
                'content_type': content_type_name,
                'content_data': content_data,
                'review_details': review_data, 
                'review_excerpt': source_object.text[:200] + '...'
            }

        elif obj.activity_type == 3: 
            target_content = source_object.content_object
            if not target_content: return None
            
            content_model = target_content.__class__.__name__

            content_data = BookSerializer(target_content).data if content_model == 'Book' else MovieSerializer(target_content).data

            return {
                'content_type': content_model,
                'content_data': content_data,
                'list_name': source_object.list.name, 
            }
            
        elif obj.activity_type == 4 and hasattr(source_object, 'following'):
            followed_user_data = UserSerializer(source_object.following).data
            
            return {
                'content_type': 'User',
                'content_data': {
                    'id': followed_user_data.get('id'),
                    'title': f"Kullanıcı: {followed_user_data.get('username')}",
                    'username': followed_user_data.get('username'),
                    'avatar_url': followed_user_data.get('avatar_url'),
                },
                'followed_user': followed_user_data
            }
            
        return None
    

class ReplySerializer(serializers.ModelSerializer):
    content_type = ContentTypeField(write_only=True) 
    object_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Reply
        fields = ['id', 'user', 'text', 'content_type', 'object_id', 'created_at']
        read_only_fields = ['user', 'created_at']
        
    def create(self, validated_data):
        user = self.context['request'].user       
        validated_data.pop('user', None) 
        
        reply = Reply.objects.create(user=user, **validated_data)
        return reply