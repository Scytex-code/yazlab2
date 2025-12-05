from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RatingViewSet, ReviewViewSet, FollowViewSet, RegisterAPIView, LoginAPIView, LogoutAPIView, FeedListView, PasswordResetRequestView, PasswordResetConfirmView, UserListViewSet, ListItemViewSet, UserDetailOrUpdateView, SearchAPIView, ContentDetailView, DiscoveryListView , ReplyViewSet, ContentFilterView

router = DefaultRouter()
router.register(r'ratings', RatingViewSet, basename='rating')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'follows', FollowViewSet, basename='follow')
router.register(r'lists', UserListViewSet, basename='list')
router.register(r'listitems', ListItemViewSet, basename='listitem')
router.register(r'replies', ReplyViewSet, basename='reply')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', RegisterAPIView.as_view(), name='register'),
    path('auth/login/', LoginAPIView.as_view(), name='login'),
    path('auth/logout/', LogoutAPIView.as_view(), name='logout'),
    path('auth/password/reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('feed/', FeedListView.as_view(), name='user-feed'),
    path('search/', SearchAPIView.as_view(), name='search-api'),
    path('discover/', DiscoveryListView.as_view(), name='discovery-list'),
    path('filter/', ContentFilterView.as_view(), name='content-filter'),
    path('content/<str:content_type>/<int:pk>/', ContentDetailView.as_view(), name='content-detail'),
    path('profile/user/<int:pk>/', UserDetailOrUpdateView.as_view(), name='user_profile_detail_update'), 
]