from django.urls import path
from rest_framework import routers
from .views import UndefiendProductServiceViewset, DefiendProductServiceViewset, DownloadProductService
from . import views

router = routers.DefaultRouter()
router.register(r'product-service', views.ProductServiceViewset, basename='product-service'),
router.register(r'product-type', views.ProductServiceTypeViewset, basename='product-service-type'),
router.register(r'revenue-type', views.RevenueTypeViewset, basename='revenue-type'),
router.register(r'expected-months', views.ExceptedMonthsViewset, basename='exoected-months'),


urlpatterns = [
    path('undefined-service', UndefiendProductServiceViewset.as_view(), name='undefined-service'),
    path('defined-service', DefiendProductServiceViewset.as_view(), name='defined-service'),
    path('download-Product-service/<str:file>/', DownloadProductService.as_view(), name='database-total'),
]
urlpatterns += router.urls
