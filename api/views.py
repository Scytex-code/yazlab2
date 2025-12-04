from rest_framework import viewsets, permissions, status, generics
from .permissions import IsOwnerOrReadOnly
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from content.models import Rating, Review, Book, Movie, UserList, ListItem, Reply
from feed.models import Follow, Activity
from django.contrib.auth import authenticate
from .serializers import (
    RatingSerializer, ReviewSerializer, FollowSerializer, UserSerializer, 
    ActivitySerializer, RegisterSerializer, LoginSerializer, 
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer, 
    BookSerializer, MovieSerializer, BookDetailSerializer, 
    MovieDetailSerializer, UserListDetailSerializer, ListItemSerializer, 
    UserProfileSerializer, ReplySerializer
)
from rest_framework.authtoken.models import Token
from django.db.models import Q, Avg, Count
from rest_framework.exceptions import NotFound
from users.models import CustomUser


class RatingViewSet(viewsets.ModelViewSet):
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated] 

    def get_queryset(self):
        return Rating.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        rating = serializer.save(user=self.request.user)
        # ⭐ AKTİVİTE KAYDI EKLEME: Puanlama (Tip 1)
        Activity.objects.create(
            user=self.request.user,
            activity_type=1, # Rating
            content_object=rating # Rating objesini Activity'ye bağla
        )


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly] 
    
    # Tüm sorgu kümesini sadece ModelViewSet'in dahili işlemlerinde kullanması için tanımlıyoruz
    queryset = Review.objects.all() 

    def get_queryset(self):
        # Bu metot LISTELEME (GET /reviews/) ve ModelViewSet'in diğer varsayılan işlemleri için kullanılır.
        # Kendi yorumlarımızı listeler:
        if self.action == 'list':
            return Review.objects.filter(user=self.request.user)
        
        # ⭐ KRİTİK DÜZELTME: Eğer işlem 'like' ise, tüm yorumları görebilmeliyiz.
        if self.action in ['like', 'retrieve']:
            return Review.objects.all()
            
        return Review.objects.all() # Diğer işlemler için tamamını döndürür

    def perform_create(self, serializer):
        review = serializer.save(user=self.request.user)
        Activity.objects.create(
            user=self.request.user,
            activity_type=2, 
            content_object=review
        )
        
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        if pk is None:
            return Response({"detail": "ID is missing."}, status=status.HTTP_400_BAD_REQUEST)
        
        target_object = None
        
        # 1. Review objesini bulmaya çalış
        try:
            target_object = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            pass
            
        # 2. Review bulunamazsa, Rating objesini bulmaya çalış
        if target_object is None:
            try:
                # Rating modelinin likes alanına erişim artık model güncellemesi sayesinde mümkün
                target_object = Rating.objects.get(pk=pk) 
            except Rating.DoesNotExist:
                pass

        # 3. Hala bulamazsak, 404 döndür
        if target_object is None:
            return Response({"detail": "No Review or Rating found for this ID."}, status=status.HTTP_404_NOT_FOUND)
        
        # 4. Beğeni mantığını uygula (Hem Review hem Rating için çalışır)
        user = request.user
        
        if user in target_object.likes.all():
            target_object.likes.remove(user)
            return Response({'status': 'unliked'}, status=status.HTTP_200_OK)
        else:
            target_object.likes.add(user)
            return Response({'status': 'liked'}, status=status.HTTP_200_OK)

# api/views.py dosyasına EKLENMESİ GEREKEN KISIM:

class FollowViewSet(viewsets.ModelViewSet):
    serializer_class = FollowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Follow.objects.filter(follower=self.request.user)

    def perform_create(self, serializer):
        follow = serializer.save(follower=self.request.user)
        # ⭐ AKTİVİTE KAYDI EKLEME: Takip (Tip 4)
        Activity.objects.create(
            user=self.request.user, # Takip eden kullanıcı
            activity_type=4, # Follow
            content_object=follow # Follow objesini Activity'ye bağla
        )


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny] 
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                "user": serializer.data,
                "token": token.key 
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny] 
    serializer_class = LoginSerializer
    
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        
        user = authenticate(username=username, password=password)
        
        if user:
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                "key": token.key, 
                "user_id": user.pk,
                "username": user.username
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Geçersiz Kullanıcı Adı veya Şifre."}, status=status.HTTP_400_BAD_REQUEST)


class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated] 

    def post(self, request):
        if hasattr(request.user, 'auth_token'):
            request.user.auth_token.delete() 
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class FeedListView(generics.ListAPIView):
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        following_ids = Follow.objects.filter(follower=user).values_list('following_id', flat=True)
        feed_user_ids = list(following_ids) + [user.id]
        queryset = Activity.objects.filter(user_id__in=feed_user_ids).select_related('user').order_by('-created_at')
        
        return queryset
    

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetRequestSerializer
    
    def post(self, request):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response({'detail': 'Şifre sıfırlama linki e-posta adresinize gönderilmiştir.'}, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetConfirmSerializer
    
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response({'detail': 'Şifreniz başarıyla sıfırlanmıştır.'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
class SearchAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated] 

    def list(self, request, *args, **kwargs):
        query = request.query_params.get('q', None)
        
        if not query:
            return Response({"detail": "Lütfen bir arama kelimesi girin."}, status=status.HTTP_400_BAD_REQUEST)

        book_results = Book.objects.filter(
            Q(title__icontains=query) | Q(authors__icontains=query) | Q(description__icontains=query)
        ).distinct()
        
        movie_results = Movie.objects.filter(
            Q(title__icontains=query) | Q(overview__icontains=query)
        ).distinct()
        
        book_data = BookSerializer(book_results, many=True).data
        for item in book_data:
            item['content_type'] = 'Book'

        movie_data = MovieSerializer(movie_results, many=True).data
        for item in movie_data:
            item['content_type'] = 'Movie'

        results = book_data + movie_data
        results.sort(key=lambda x: x['title'])

        return Response(results, status=status.HTTP_200_OK)
    

class DiscoveryListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated] 

    def list(self, request, *args, **kwargs):
        list_type = request.query_params.get('type', 'popular')
        
        top_books = Book.objects.annotate(
            avg_score=Avg('rating__score')
        ).filter(
            avg_score__isnull=False
        ).order_by('-avg_score')[:10]
        
        if list_type == 'popular':
            top_movies = Movie.objects.order_by('-id')[:10] 
        else: 
            top_movies = Movie.objects.annotate(
                avg_score=Avg('rating__score')
            ).filter(
                avg_score__isnull=False
            ).order_by('-avg_score')[:10]
        
        response_data = []
        
        if list_type == 'top_rated':
            book_data = BookSerializer(top_books, many=True).data
            for item in book_data:
                item['content_type'] = 'Book'
                response_data.append(item)
        
        return Response(response_data, status=status.HTTP_200_OK)
    

class ContentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated] 

    def get(self, request, content_type, pk):
        try:
            if content_type.lower() == 'book':
                model = Book
                serializer_class = BookDetailSerializer
            elif content_type.lower() == 'movie':
                model = Movie
                serializer_class = MovieDetailSerializer 
            else:
                return Response({"detail": "Geçersiz içerik tipi."}, status=status.HTTP_400_BAD_REQUEST)
                
            content_obj = model.objects.get(pk=pk)
            
        except model.DoesNotExist:
            raise NotFound(f"Belirtilen {content_type} bulunamadı.")
            
        serializer = serializer_class(content_obj, context={'request': request})
        return Response(serializer.data)
    

class UserDetailOrUpdateView(generics.RetrieveUpdateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserProfileSerializer 
    permission_classes = [permissions.IsAuthenticated] 
    lookup_field = 'pk' 

    def retrieve(self, request, *args, **kwargs):
        try:
            profile_user = self.get_object()
        except NotFound:
            raise NotFound("Kullanıcı bulunamadı.")

        followers_count = Follow.objects.filter(following=profile_user).count()
        following_count = Follow.objects.filter(follower=profile_user).count()

        serializer = self.get_serializer(profile_user).data 
        
        is_owner = (request.user.pk == profile_user.pk)
        is_following = False
        if not is_owner:
            is_following = Follow.objects.filter(follower=request.user, following=profile_user).exists()

        response_data = {
            "user_details": serializer,
            "stats": {
                "followers": followers_count,
                "following": following_count,
            },
            "profile_status": {
                "is_owner": is_owner,
                "is_following": is_following,
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)

    def get_object(self):
        if self.request.method in ['PUT', 'PATCH']:
             return self.request.user 
        
        return super().get_object() 


class UserListViewSet(viewsets.ModelViewSet):
    serializer_class = UserListDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserList.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ListItemViewSet(viewsets.ModelViewSet):
    serializer_class = ListItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ListItem.objects.filter(list__user=self.request.user)
    
    def perform_create(self, serializer):
        list_item = serializer.save(user=self.request.user)
        # ⭐ AKTİVİTE KAYDI EKLEME: Listeye Ekleme (Tip 3)
        Activity.objects.create(
            user=self.request.user,
            activity_type=3, # List_Add
            content_object=list_item # ListItem objesini Activity'ye bağla
        )


class ReplyViewSet(viewsets.ModelViewSet):
    serializer_class = ReplySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Tüm yanıtları listelemek yerine, sadece ilgili Review/Rating'e ait olanları listeleriz
        return Reply.objects.all() 
        
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)