from rest_framework import serializers
from .models import ProductService, ProductServiceType, RevenueType, ExpectedMonths
from authentication.models import Company

class ProductServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductService
        fields = ('user', 'product_name', 'productp_service_type', 'revenue_type', "id", "is_active")
        depth = 1
        extra_kwargs = {
            'id': {'read_only': True},
            'product_name': {'required': True},
            'productp_service_type': {'required': True},
            'revenue_type': {'required': True},
            # 'user': {'write_only': True}
        }
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop('user', None)
        return data
    
class CreateProductServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductService
        fields = ('user', 'product_name', 'productp_service_type', 'revenue_type', "id", "is_active")
        extra_kwargs = {
            'id': {'read_only': True},
            'product_name': {'required': True},
            'productp_service_type': {'required': True},
            'revenue_type': {'required': True},
            # 'user': {'write_only': True}
        }

# class UpdateProductServiceSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = ProductService
#         fields = ('user', 'product_name', 'productp_service_type', 'revenue_type', "id", "is_active")
#         extra_kwargs = {
#             'id': {'read_only': True},
#             'product_name': {'read_only': True},
#             'productp_service_type': {'required': True},
#             'revenue_type': {'required': True},
#             # 'user': {'write_only': True}
#         }


class UndefiendProductServiceSerializer(serializers.Serializer):
    product_name = serializers.CharField(max_length=400)
    id = serializers.IntegerField()


class ProductServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductServiceType
        fields = '__all__'
        extra_kwargs = {
            'productp_service_type': {'required': True},
        }


class RevenueTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueType
        fields = '__all__'
        extra_kwargs = {
            'revenue_type': {'required': True},
        }


# class ExpectedMonthsSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = ExpectedMonths
#         fields = '__all__'

class ExpectedMonthsSerializer(serializers.Serializer):
    months = serializers.IntegerField(default=0)
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all(), allow_null=False, allow_empty=False)
