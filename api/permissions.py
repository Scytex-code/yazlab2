# api/permissions.py

from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Sadece objenin sahibi olan kullanıcıların düzenleme/silme yapmasına izin verir.
    Diğer kullanıcılar sadece okuyabilir (GET, HEAD, OPTIONS).
    """

    def has_object_permission(self, request, view, obj):
        # Okuma izinleri (GET, HEAD veya OPTIONS) her zaman herkese verilir.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Yazma izinleri (PUT, PATCH, DELETE) sadece objenin sahibi olan kullanıcıya verilir.
        # Burada "obj.user" alanı, Review modelinizin yorumun sahibini tutan alanı olmalıdır.
        return obj.user == request.user