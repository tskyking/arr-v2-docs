from configparser import MAX_INTERPOLATION_DEPTH
import threading
import calendar
from datetime import datetime

from django.dispatch import receiver
from django.db.models.signals import post_save
from dateutil.relativedelta import relativedelta
from django.db.models.signals import Signal

from .saasot_calculation.revenue1 import *
from .saasot_calculation import revenue_month
from .models import *


from .serializers import (TransactionScreenSerilizer)

# signal for Calculation after update and create ---------------------------------


@receiver(post_save, sender=Item)
def calculation_on_item_save(sender, instance, created, **kwargs):
    obj = instance

    rev = revenue(obj)
    bill = billing(obj)
    def_rev = deferred_revenue(obj)
    rev_mth = revenue_month.revenue(obj)
    bill_mth = revenue_month.billing(obj)
    def_rev_mth = revenue_month.deferred_revenue(obj)

    if created:
        if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
            arr = item_arr(obj)
            arr_mth = revenue_month.item_arr(obj)

            Calculation.objects.get_or_create(
                items=obj, 
                defaults={'revenue': rev, 'deffered_revenue': def_rev, 'billing': bill, 'arr': arr}
            )

            CalculationMonths.objects.get_or_create(
                items=obj, 
                defaults={'revenue': rev_mth, 'deffered_revenue': def_rev_mth, 'billing': bill_mth, 'arr': arr_mth}
            )
        else:
            Calculation.objects.get_or_create(
                items=obj, 
                defaults={'revenue': rev, 'deffered_revenue': def_rev, 'billing': bill}
            )

            CalculationMonths.objects.get_or_create(
                items=obj, 
                defaults={'revenue': rev_mth, 'deffered_revenue': def_rev_mth, 'billing': bill_mth}
            )
    else:
        try:
            calculation = Calculation.objects.get(items=obj)
            if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
                arr = item_arr(obj)
                calculation.revenue = rev
                calculation.billing = bill
                calculation.deffered_revenue = def_rev
                calculation.arr = arr
            else:
                calculation.revenue = rev
                calculation.billing = bill
                calculation.deffered_revenue = def_rev
            calculation.save()
        except Calculation.DoesNotExist:
            if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
                arr = item_arr(obj)
                Calculation.objects.create(
                    items=obj, revenue=rev, deffered_revenue=def_rev, billing=bill, arr=arr
                )
            else:
                Calculation.objects.create(
                    items=obj, revenue=rev, deffered_revenue=def_rev, billing=bill
                )

        try:
            calculation = CalculationMonths.objects.get(items=obj)
            if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
                arr_mth = revenue_month.item_arr(obj)
                calculation.revenue = rev_mth
                calculation.billing = bill_mth
                calculation.deffered_revenue = def_rev_mth
                calculation.arr = arr_mth
            else:
                calculation.revenue = rev_mth
                calculation.billing = bill_mth
                calculation.deffered_revenue = def_rev_mth
            calculation.save()
        except CalculationMonths.DoesNotExist:
            if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
                arr_mth = revenue_month.item_arr(obj)
                CalculationMonths.objects.create(
                    items=obj, revenue=rev_mth, deffered_revenue=def_rev_mth, billing=bill_mth, arr=arr_mth
                )
            else:
                CalculationMonths.objects.create(
                    items=obj, revenue=rev_mth, deffered_revenue=def_rev_mth, billing=bill_mth
                )

        print("An instance of MyModel has been updated.")


arr_grace_period_signal = Signal()

@receiver(arr_grace_period_signal)
def calculation_on_arr_grace_period_handler(sender, instance, created, user, **kwargs):
    # Your signal logic goes here
    print("A new instance of MyModel has been created.")
    threading.Thread(target=arr_grace, args=[user]).start()



import pytz
from collections import defaultdict
from datetime import datetime
from dateutil.relativedelta import relativedelta
from collections import defaultdict, OrderedDict
from datetime import datetime
from dateutil.relativedelta import relativedelta
from django.db.models import Subquery, OuterRef, Count

def calculate_end_date(item, months_between, months_count):
    if months_count >= 1 and months_between > months_count:
        months_between = months_count

    if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
        end_date = item.s_end_d + relativedelta(months=months_between, day=31)
    else:
        end_date = item.s_end_d + relativedelta(months=months_between)
    return end_date

def reset_item_calculation_before_grace(items):
    if items:
        for item in items:
            calc = Calculation.objects.get(items=item)
            arr = calc.arr
            new_arr = []
            
            # Check if arr is empty before accessing its last element
            if not arr:
                continue
            
            value = arr[-1]['value']
            start_date = item.s_start_d
            end_date = item.s_end_d

            current_date = start_date
            while current_date < end_date:
                if current_date.year == end_date.year and current_date.month == end_date.month:
                    if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
                        current_date += relativedelta(months=1)
                        break

                if current_date.day != start_date.day:
                    try:
                        current_date = current_date.replace(day=start_date.day)
                    except:
                        last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day
                        current_date = current_date.replace(day=last_day_of_month)

                arr_dic = {
                    'date': current_date.strftime("%b %y"),
                    'update': False,
                    'value': value,
                    'pending_arr': current_date >= item.s_end_d
                }
                new_arr.append(arr_dic)
                current_date += relativedelta(months=1)
            calc.arr = new_arr
            calc.save()

def arr_grace(user):
    print('arr_grace running')

    grace_period = ArrGracePeriod.objects.filter(company=user.company).first()
    months_between = grace_period.months
    item_ids = Item.objects.filter(
        tansaction__user__company=user.company,
        productp_service__revenue_type__revenue_type="over life of subscription"
    ).values('tansaction_id')

    transactions = Transaction.objects.filter(id__in=item_ids).order_by('customer_name').distinct('customer_name')

    monthly_totals = defaultdict(lambda: defaultdict(float))

    for tsc in transactions:
        items = Item.objects.filter(
            tansaction__customer_name=tsc.customer_name,
            tansaction__user__company=user.company,
            productp_service__revenue_type__revenue_type="over life of subscription"
        ).order_by('-s_end_d')

        reset_item_calculation_before_grace(items)

        if items:
            for item in items:
                calc = Calculation.objects.get(items=item)
                for index, entry in enumerate(calc.arr):
                    date_str = entry['date']
                    date_obj = datetime.strptime(date_str, "%b %y")
                    formatted_date = date_obj.strftime("%Y-%m-%d %H:%M:%S")
                    value = entry['value']

                    if formatted_date not in monthly_totals[tsc.customer_name]:
                        monthly_totals[tsc.customer_name][formatted_date] = {'index': index, 'value': value, 't_id': item.tansaction_id, 'item_id': item.id}
                    else:
                        monthly_totals[tsc.customer_name][formatted_date]['value'] += value


    for customer_name, totals in monthly_totals.items():

        # Sorting the totals by date
        sorted_totals = sorted(totals.items(), key=lambda x: datetime.strptime(x[0], '%Y-%m-%d %H:%M:%S'))
        sorted_dates_values = [{'date': key, 'value': value['value'], 'index': value['index'], 't_id': value['t_id'], 'item_id': value['item_id']} for key, value in sorted_totals]

        missing_months = []
        if sorted_dates_values:
            first_date = datetime.strptime(sorted_dates_values[0]['date'], '%Y-%m-%d %H:%M:%S')
            last_date = datetime.strptime(sorted_dates_values[-1]['date'], '%Y-%m-%d %H:%M:%S')
            current_date = first_date

            while current_date < last_date:
                current_date += relativedelta(months=1)
                formatted_date = current_date.strftime("%Y-%m-%d %H:%M:%S")
                if formatted_date not in [entry['date'] for entry in sorted_dates_values]:
                    closest_entry = min(
                        sorted_dates_values, 
                        key=lambda x: abs(datetime.strptime(x['date'], '%Y-%m-%d %H:%M:%S') - current_date)
                    )
                    missing_months.append({
                        'date': formatted_date,
                        't_id': closest_entry['t_id'],
                        'item_id': closest_entry['item_id']
                    })

        missing_months = sorted(missing_months, key=lambda x: x['date'])

        if missing_months:
            before_after_transactions = []
            last_item_id = None
            for missing_month in missing_months:
                before_transaction = None
                after_transaction = None
                missing_month_date = datetime.strptime(missing_month['date'], '%Y-%m-%d %H:%M:%S')

                for entry in sorted_dates_values:
                    date = datetime.strptime(entry['date'], '%Y-%m-%d %H:%M:%S')
                    if date < missing_month_date:
                        before_transaction = entry
                    elif date > missing_month_date and after_transaction is None:
                        after_transaction = entry
                        break

                if before_transaction and after_transaction:
                    value_difference = after_transaction['value'] - before_transaction['value']
                    before_date = datetime.strptime(before_transaction['date'], '%Y-%m-%d %H:%M:%S')
                    after_date = datetime.strptime(after_transaction['date'], '%Y-%m-%d %H:%M:%S')
                    months_count = (after_date.year - before_date.year) * 12 + after_date.month - before_date.month - 1
                else:
                    value_difference = None
                    months_count = 0

                if last_item_id:
                    missing_month['item_id'] = last_item_id
                last_item_id = missing_month['item_id']

                before_after_transactions.append({
                    'missing_month': missing_month,
                    'before': before_transaction,
                    'after': after_transaction,
                    'value_difference': value_difference,
                    'months_count': months_count
                })

            for missing_item_transaction in before_after_transactions:
                months_count = missing_item_transaction['months_count']
                item_id = missing_item_transaction['missing_month']['item_id']
                try:
                    missing_item = Item.objects.get(id=item_id)
                except Item.DoesNotExist:
                    print(f"Item with id {item_id} does not exist.")
                    continue

                try:
                    calculate_arr(missing_item, months_between, months_count)
                    calculate_arr_by_month(missing_item, months_between, months_count)
                except Exception as e:
                    print(f"Error processing item with id {item_id}: {e}")

        else:
            # No missing months, print the last t_id and item_id
            if sorted_dates_values:
                last_entry = sorted_dates_values[-1]
                # print(f"Customer: {customer_name}, Last t_id: {last_entry['t_id']}, Last item_id: {last_entry['item_id']}")

                try:
                    item_id = last_entry['item_id']
                    item = Item.objects.get(id=item_id)
                    calculate_arr(item, months_between, 0)
                    calculate_arr_by_month(item, months_between, 0)
                except Exception as e:
                    print('Exception: ', e)


    # for customer_name, totals in monthly_totals.items():

    #     # if customer_name == 'Branford (CT) Fire Department, Town of':
    #     #     print('<><><><><><><><><><><>< 1. totals ><><><><><><><><><><><><>')
    #     #     print(totals)

    #     sorted_totals = sorted(totals.items(), key=lambda x: datetime.strptime(x[0], '%Y-%m-%d %H:%M:%S'))
    #     sorted_dates_values = [{'date': key, 'value': value['value'], 'index': value['index'], 't_id': value['t_id'], 'item_id': value['item_id']} for key, value in sorted_totals]

    #     missing_months = []
    #     if sorted_dates_values:
    #         first_date = datetime.strptime(sorted_dates_values[0]['date'], '%Y-%m-%d %H:%M:%S')
    #         last_date = datetime.strptime(sorted_dates_values[-1]['date'], '%Y-%m-%d %H:%M:%S')
    #         current_date = first_date

    #         while current_date < last_date:
    #             current_date += relativedelta(months=1)
    #             formatted_date = current_date.strftime("%Y-%m-%d %H:%M:%S")
    #             if formatted_date not in [entry['date'] for entry in sorted_dates_values]:
    #                 closest_entry = min(
    #                     sorted_dates_values, 
    #                     key=lambda x: abs(datetime.strptime(x['date'], '%Y-%m-%d %H:%M:%S') - current_date)
    #                 )
    #                 missing_months.append({
    #                     'date': formatted_date,
    #                     't_id': closest_entry['t_id'],
    #                     'item_id': closest_entry['item_id']
    #                 })

    #     missing_months = sorted(missing_months, key=lambda x: x['date'])

    #     if customer_name == 'Branford (CT) Fire Department, Town of' or customer_name == 'Ann Arbor Township (MI) Fire Department':
    #         print('<><><><><><><><><><><>< customer_name ><><><><><><><><><><><><>')
    #         print(missing_months)

    #     if missing_months:
    #         before_after_transactions = []
    #         last_item_id = None
    #         for missing_month in missing_months:
    #             before_transaction = None
    #             after_transaction = None
    #             missing_month_date = datetime.strptime(missing_month['date'], '%Y-%m-%d %H:%M:%S')

    #             for entry in sorted_dates_values:
    #                 date = datetime.strptime(entry['date'], '%Y-%m-%d %H:%M:%S')
    #                 if date < missing_month_date:
    #                     before_transaction = entry
    #                 elif date > missing_month_date and after_transaction is None:
    #                     after_transaction = entry
    #                     break

    #             if before_transaction and after_transaction:
    #                 value_difference = after_transaction['value'] - before_transaction['value']
    #                 before_date = datetime.strptime(before_transaction['date'], '%Y-%m-%d %H:%M:%S')
    #                 after_date = datetime.strptime(after_transaction['date'], '%Y-%m-%d %H:%M:%S')
    #                 months_count = (after_date.year - before_date.year) * 12 + after_date.month - before_date.month - 1
    #             else:
    #                 value_difference = None
    #                 months_count = 0

    #             if last_item_id:
    #                 missing_month['item_id'] = last_item_id
    #             last_item_id = missing_month['item_id']

    #             if customer_name == 'Branford (CT) Fire Department, Town of':
    #                 print('<<<<<<<<<<<<<<<<<<<< last_item_id >>>>>>>>>>>>>>>>>>>')
    #                 print(missing_month['t_id'])
    #                 print(missing_month['item_id'])

    #             before_after_transactions.append({
    #                 'missing_month': missing_month,
    #                 'before': before_transaction,
    #                 'after': after_transaction,
    #                 'value_difference': value_difference,
    #                 'months_count': months_count
    #             })

    #         for missing_item_transaction in before_after_transactions:
    #             months_count = missing_item_transaction['months_count']
    #             item_id = missing_item_transaction['missing_month']['item_id']
    #             try:
    #                 missing_item = Item.objects.get(id=item_id)
    #             except Item.DoesNotExist:
    #                 print(f"Item with id {item_id} does not exist.")
    #                 continue

    #             try:
    #                 calculate_arr(missing_item, months_between, months_count)
    #                 # calculate_arr_by_month(missing_item, months_between, months_count)
    #             except Exception as e:
    #                 print(f"Error processing item with id {item_id}: {e}")

    #     else:
    #         transactions = Transaction.objects.filter(id__in=item_ids, company_id=user.company) \
    #         .order_by('customer_name', '-pk')

    #         first_transaction_ids = OrderedDict()
    #         for tsc in transactions:
    #             customer_name = tsc.customer_name
    #             if customer_name not in first_transaction_ids:
    #                 first_transaction_ids[customer_name] = tsc.id

    #         for customer_name, transaction_id in first_transaction_ids.items():
    #             items = Item.objects.filter(
    #                 tansaction__customer_name=customer_name,
    #                 tansaction__user__company=user.company,
    #                 tansaction__id=transaction_id,
    #                 productp_service__revenue_type__revenue_type="over life of subscription"
    #             ).order_by('-pk')

    #             if items.exists():
    #                 max_end_date_item = items.first()
    #                 try:
    #                     if months_between > 0:
    #                         calculate_arr(max_end_date_item, months_between, 0)
    #                 except Exception as e:
    #                     print('Exception: ', e)

def calculate_arr(item, months_between, months_count):
    try:
        calc = Calculation.objects.get(items=item)
        arr = calc.arr
        new_arr = []
        value = arr[-1]['value']
        start_date = item.s_start_d
        end_date = calculate_end_date(item, months_between, months_count)

        current_date = start_date
        while current_date < end_date:
            if current_date.year == end_date.year and current_date.month == end_date.month:
                if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
                    current_date += relativedelta(months=1)
                    break

            if current_date.day != start_date.day:
                try:
                    current_date = current_date.replace(day=start_date.day)
                except:
                    last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day
                    current_date = current_date.replace(day=last_day_of_month)

            arr_dic = {
                'date': current_date.strftime("%b %y"),
                'update': False,
                'value': value,
                'pending_arr': current_date >= item.s_end_d
            }
            new_arr.append(arr_dic)
            current_date += relativedelta(months=1)
        calc.arr = new_arr

        # print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$')
        # print(calc.arr)
        calc.save()
    except Exception as e:
        print('Exception Calculate Arr: ', e)

def calculate_arr_by_month(item, months_between, months_count):
    try:
        calc = CalculationMonths.objects.get(items=item)
        arr = calc.arr
        new_arr = []
        value = arr[-1]['value']
        start_date = item.s_start_d
        end_date = calculate_end_date(item, months_between, months_count)

        current_date = start_date
        while current_date < end_date:
            if current_date.year == end_date.year and current_date.month == end_date.month:
                if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
                    current_date += relativedelta(months=1)
                    break

            if current_date.day != start_date.day:
                try:
                    current_date = current_date.replace(day=start_date.day)
                except:
                    last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day
                    current_date = current_date.replace(day=last_day_of_month)

            arr_dic = {
                'date': current_date.strftime("%b %y"),
                'update': False,
                'value': value,
                'pending_arr': current_date >= item.s_end_d
            }
            new_arr.append(arr_dic)
            current_date += relativedelta(months=1)
        calc.arr = new_arr
        calc.save()
    except Exception as e:
        print('Exception Calculate Arr by Month: ', e)



# @receiver(post_save, sender=Item)
# def calculation_on_item_save(sender, instance, created, **kwargs):
#     obj = instance

#     rev = revenue(obj)
#     bill = billing(obj)
#     def_rev = deferred_revenue(obj)
#     rev_mth = revenue_month.revenue(obj)
#     bill_mth = revenue_month.billing(obj)
#     def_rev_mth = revenue_month.deferred_revenue(obj)

#     if created:
#         if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
#             arr = item_arr(obj)
#             arr_mth = revenue_month.item_arr(obj)

#             Calculation.objects.get_or_create(
#                 items=obj, 
#                 defaults={'revenue': rev, 'deffered_revenue': def_rev, 'billing': bill, 'arr': arr}
#             )

#             CalculationMonths.objects.get_or_create(
#                 items=obj, 
#                 defaults={'revenue': rev_mth, 'deffered_revenue': def_rev_mth, 'billing': bill_mth, 'arr': arr_mth}
#             )
#         else:
#             Calculation.objects.get_or_create(
#                 items=obj, 
#                 defaults={'revenue': rev, 'deffered_revenue': def_rev, 'billing': bill}
#             )

#             CalculationMonths.objects.get_or_create(
#                 items=obj, 
#                 defaults={'revenue': rev_mth, 'deffered_revenue': def_rev_mth, 'billing': bill_mth}
#             )
#     else:
#         try:
#             calculation = Calculation.objects.get(items=obj)
#             if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
#                 arr = item_arr(obj)
#                 calculation.revenue = rev
#                 calculation.billing = bill
#                 calculation.deffered_revenue = def_rev
#                 calculation.arr = arr
#             else:
#                 calculation.revenue = rev
#                 calculation.billing = bill
#                 calculation.deffered_revenue = def_rev
#             calculation.save()
#         except Calculation.DoesNotExist:
#             if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
#                 arr = item_arr(obj)
#                 Calculation.objects.create(
#                     items=obj, revenue=rev, deffered_revenue=def_rev, billing=bill, arr=arr
#                 )
#             else:
#                 Calculation.objects.create(
#                     items=obj, revenue=rev, deffered_revenue=def_rev, billing=bill
#                 )

#         try:
#             calculation = CalculationMonths.objects.get(items=obj)
#             if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
#                 arr_mth = revenue_month.item_arr(obj)
#                 calculation.revenue = rev_mth
#                 calculation.billing = bill_mth
#                 calculation.deffered_revenue = def_rev_mth
#                 calculation.arr = arr_mth
#             else:
#                 calculation.revenue = rev_mth
#                 calculation.billing = bill_mth
#                 calculation.deffered_revenue = def_rev_mth
#             calculation.save()
#         except CalculationMonths.DoesNotExist:
#             if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
#                 arr_mth = revenue_month.item_arr(obj)
#                 CalculationMonths.objects.create(
#                     items=obj, revenue=rev_mth, deffered_revenue=def_rev_mth, billing=bill_mth, arr=arr_mth
#                 )
#             else:
#                 CalculationMonths.objects.create(
#                     items=obj, revenue=rev_mth, deffered_revenue=def_rev_mth, billing=bill_mth
#                 )

#         print("An instance of MyModel has been updated.")


# arr_grace_period_signal = Signal()

# @receiver(arr_grace_period_signal)
# def calculation_on_arr_grace_period_handler(sender, instance, created, user, **kwargs):
#     # Your signal logic goes here
#     print("A new instance of MyModel has been created.")
#     threading.Thread(target=arr_grace, args=[user]).start()


# from collections import defaultdict
# from datetime import datetime
# from dateutil.relativedelta import relativedelta
# from collections import defaultdict, OrderedDict
# from datetime import datetime
# from dateutil.relativedelta import relativedelta
# from django.db.models import Subquery, OuterRef, Count

# def calculate_end_date(item, months_between, months_count):
#     if months_count >= 1 and months_between > months_count:
#         months_between = months_count

#     if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
#         end_date = item.s_end_d + relativedelta(months=months_between, day=31)
#     else:
#         end_date = item.s_end_d + relativedelta(months=months_between)
#     return end_date

# def reset_item_calculation_before_grace(items):
#     if items:
#         for item in items:
#             calc = Calculation.objects.get(items=item)
#             arr = calc.arr
#             new_arr = []
            
#             # Check if arr is empty before accessing its last element
#             if not arr:
#                 continue
            
#             value = arr[-1]['value']
#             start_date = item.s_start_d
#             end_date = item.s_end_d

#             current_date = start_date
#             while current_date < end_date:
#                 if current_date.year == end_date.year and current_date.month == end_date.month:
#                     if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
#                         current_date += relativedelta(months=1)
#                         break

#                 if current_date.day != start_date.day:
#                     try:
#                         current_date = current_date.replace(day=start_date.day)
#                     except:
#                         last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day
#                         current_date = current_date.replace(day=last_day_of_month)

#                 arr_dic = {
#                     'date': current_date.strftime("%b %y"),
#                     'update': False,
#                     'value': value,
#                     'pending_arr': current_date >= item.s_end_d
#                 }
#                 new_arr.append(arr_dic)
#                 current_date += relativedelta(months=1)
#             calc.arr = new_arr
#             calc.save()

# def arr_grace(user):
#     print('arr_grace running')

#     grace_period = ArrGracePeriod.objects.filter(company=user.company).first()
#     months_between = grace_period.months
#     item_ids = Item.objects.filter(
#         tansaction__user__company=user.company,
#         productp_service__revenue_type__revenue_type="over life of subscription"
#     ).values('tansaction_id')

#     transactions = Transaction.objects.filter(id__in=item_ids).order_by('customer_name').distinct('customer_name')

#     monthly_totals = defaultdict(lambda: defaultdict(float))

#     for tsc in transactions:
#         items = Item.objects.filter(
#             tansaction__customer_name=tsc.customer_name,
#             tansaction__user__company=user.company,
#             productp_service__revenue_type__revenue_type="over life of subscription"
#         ).order_by('-s_end_d')

#         reset_item_calculation_before_grace(items)

#         if items:
#             for item in items:
#                 calc = Calculation.objects.get(items=item)
#                 for index, entry in enumerate(calc.arr):
#                     date_str = entry['date']
#                     date_obj = datetime.strptime(date_str, "%b %y")
#                     formatted_date = date_obj.strftime("%Y-%m-%d %H:%M:%S")
#                     value = entry['value']

#                     if formatted_date not in monthly_totals[tsc.customer_name]:
#                         monthly_totals[tsc.customer_name][formatted_date] = {'index': index, 'value': value, 't_id': item.tansaction_id, 'item_id': item.id}
#                     else:
#                         monthly_totals[tsc.customer_name][formatted_date]['value'] += value


#     for customer_name, totals in monthly_totals.items():

#         # Sorting the totals by date
#         sorted_totals = sorted(totals.items(), key=lambda x: datetime.strptime(x[0], '%Y-%m-%d %H:%M:%S'))
#         sorted_dates_values = [{'date': key, 'value': value['value'], 'index': value['index'], 't_id': value['t_id'], 'item_id': value['item_id']} for key, value in sorted_totals]

#         missing_months = []
#         if sorted_dates_values:
#             first_date = datetime.strptime(sorted_dates_values[0]['date'], '%Y-%m-%d %H:%M:%S')
#             last_date = datetime.strptime(sorted_dates_values[-1]['date'], '%Y-%m-%d %H:%M:%S')
#             current_date = first_date

#             while current_date < last_date:
#                 current_date += relativedelta(months=1)
#                 formatted_date = current_date.strftime("%Y-%m-%d %H:%M:%S")
#                 if formatted_date not in [entry['date'] for entry in sorted_dates_values]:
#                     closest_entry = min(
#                         sorted_dates_values, 
#                         key=lambda x: abs(datetime.strptime(x['date'], '%Y-%m-%d %H:%M:%S') - current_date)
#                     )

#                 # if datetime.strptime(formatted_date, '%Y-%m-%d %H:%M:%S') not in [datetime.strptime(entry['date'], '%Y-%m-%d %H:%M:%S') for entry in sorted_dates_values]:
#                 #     closest_entry = min(
#                 #         sorted_dates_values, 
#                 #         key=lambda x: abs(datetime.strptime(x['date'], '%Y-%m-%d %H:%M:%S') - datetime.strptime(formatted_date, '%Y-%m-%d %H:%M:%S'))
#                 #     )
#                     missing_months.append({
#                         'date': formatted_date,
#                         't_id': closest_entry['t_id'],
#                         'item_id': closest_entry['item_id']
#                     })

#         missing_months = sorted(missing_months, key=lambda x: x['date'])

#         if missing_months:
#             before_after_transactions = []
#             last_item_id = None
#             for missing_month in missing_months:
#                 before_transaction = None
#                 after_transaction = None
#                 missing_month_date = datetime.strptime(missing_month['date'], '%Y-%m-%d %H:%M:%S')

#                 for entry in sorted_dates_values:
#                     date = datetime.strptime(entry['date'], '%Y-%m-%d %H:%M:%S')
#                     if date < missing_month_date:
#                         before_transaction = entry
#                     elif date > missing_month_date and after_transaction is None:
#                         after_transaction = entry
#                         break

#                 if before_transaction and after_transaction:
#                     value_difference = after_transaction['value'] - before_transaction['value']
#                     before_date = datetime.strptime(before_transaction['date'], '%Y-%m-%d %H:%M:%S')
#                     after_date = datetime.strptime(after_transaction['date'], '%Y-%m-%d %H:%M:%S')
#                     months_count = (after_date.year - before_date.year) * 12 + after_date.month - before_date.month - 1
#                 else:
#                     value_difference = None
#                     months_count = 0

#                 if last_item_id:
#                     missing_month['item_id'] = last_item_id
#                 last_item_id = missing_month['item_id']

#                 before_after_transactions.append({
#                     'missing_month': missing_month,
#                     'before': before_transaction,
#                     'after': after_transaction,
#                     'value_difference': value_difference,
#                     'months_count': months_count
#                 })

#             for missing_item_transaction in before_after_transactions:
#                 months_count = missing_item_transaction['months_count']
#                 item_id = missing_item_transaction['missing_month']['item_id']
#                 try:
#                     missing_item = Item.objects.get(id=item_id)
#                 except Item.DoesNotExist:
#                     print(f"Item with id {item_id} does not exist.")
#                     continue

#                 try:
#                     calculate_arr(missing_item, months_between, months_count)
#                     calculate_arr_by_month(missing_item, months_between, months_count)
#                 except Exception as e:
#                     print(f"Error processing item with id {item_id}: {e}")

#         else:
#             # No missing months, print the last t_id and item_id
#             if sorted_dates_values:
#                 last_entry = sorted_dates_values[-1]
#                 # print(f"Customer: {customer_name}, Last t_id: {last_entry['t_id']}, Last item_id: {last_entry['item_id']}")

#                 try:
#                     item_id = last_entry['item_id']
#                     item = Item.objects.get(id=item_id)
#                     calculate_arr(item, months_between, 0)
#                     calculate_arr_by_month(item, months_between, 0)
#                 except Exception as e:
#                     print('Exception: ', e)

# def calculate_arr(item, months_between, months_count):
#     try:
#         calc = Calculation.objects.get(items=item)
#         arr = calc.arr
#         new_arr = []
#         value = arr[-1]['value']
#         start_date = item.s_start_d
#         end_date = calculate_end_date(item, months_between, months_count)

#         current_date = start_date
#         while current_date < end_date:
#             if current_date.year == end_date.year and current_date.month == end_date.month:
#                 if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
#                     current_date += relativedelta(months=1)
#                     break

#             if current_date.day != start_date.day:
#                 try:
#                     current_date = current_date.replace(day=start_date.day)
#                 except:
#                     last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day
#                     current_date = current_date.replace(day=last_day_of_month)

#             arr_dic = {
#                 'date': current_date.strftime("%b %y"),
#                 'update': False,
#                 'value': value,
#                 'pending_arr': current_date >= item.s_end_d
#             }
#             new_arr.append(arr_dic)
#             current_date += relativedelta(months=1)
#         calc.arr = new_arr

#         # print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$')
#         # print(calc.arr)
#         calc.save()
#     except Exception as e:
#         print('Exception Calculate Arr: ', e)

# def calculate_arr_by_month(item, months_between, months_count):
#     try:
#         calc = CalculationMonths.objects.get(items=item)
#         arr = calc.arr
#         new_arr = []
#         value = arr[-1]['value']
#         start_date = item.s_start_d
#         end_date = calculate_end_date(item, months_between, months_count)

#         current_date = start_date
#         while current_date < end_date:
#             if current_date.year == end_date.year and current_date.month == end_date.month:
#                 if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
#                     current_date += relativedelta(months=1)
#                     break

#             if current_date.day != start_date.day:
#                 try:
#                     current_date = current_date.replace(day=start_date.day)
#                 except:
#                     last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day
#                     current_date = current_date.replace(day=last_day_of_month)

#             arr_dic = {
#                 'date': current_date.strftime("%b %y"),
#                 'update': False,
#                 'value': value,
#                 'pending_arr': current_date >= item.s_end_d
#             }
#             new_arr.append(arr_dic)
#             current_date += relativedelta(months=1)
#         calc.arr = new_arr
#         calc.save()
#     except Exception as e:
#         print('Exception Calculate Arr by Month: ', e)



# def arr_grace(user):
#     item_ids = Item.objects.filter(tansaction__user__company=user.company,
#                                    productp_service__revenue_type__revenue_type="over life of subscription").values('tansaction_id')
#     grace_period = ArrGracePeriod.objects.filter(company=user.company).first()
#     transaction = Transaction.objects.filter(id__in=item_ids).order_by(
#         'customer_name').distinct('customer_name')
#     for tsc in transaction:
#         months_between = grace_period.months
#         r = 0
#         start_dates = []
#         # items = Item.objects.filter(tansaction__customer_name=tsc.customer_name)
#         items = Item.objects.filter(tansaction__customer_name=tsc.customer_name, tansaction__user__company=user.company,
#                                     productp_service__revenue_type__revenue_type="over life of subscription").order_by('-s_start_d')
#         for index, item in enumerate(items):
#             if index >= 1:
#                 months_gap = (items[index-1].s_end_d.year - item.s_end_d.year) * \
#                             12 + items[index-1].s_end_d.month - \
#                             item.s_end_d.month - 1
#                 print(months_gap, "LLLLLLLLLLLLLLLLLLL",items[index-1].s_end_d, "PPPPPPPPPPPPPPPPPPPPPP", item.s_end_d)
#             try:
#                 if (index == 0 or ((index >= 1 and items[index-1].s_end_d.month == item.s_end_d.month and items[index-1].s_end_d.year == item.s_end_d.year)) or (months_gap == 0 and items[index-1].s_end_d.day < calendar.monthrange(items[index-1].s_end_d.year, items[index-1].s_end_d.month)[1] )) and r == 0:
                    
#                     print("(((((((((((((((((())))))))))))))))))")
#                     if months_between > 0:
#                         try:
#                             calc = Calculation.objects.get(items=item)
#                             arr = calc.arr
#                             new_arr = []
#                             leng = len(arr)
#                             value = arr[leng-1]['value']
#                             start_date = item.s_start_d
#                             if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
#                                 end_date = item.s_end_d + \
#                                     relativedelta(
#                                         months=months_between, day=31)
#                             else:
#                                 end_date = item.s_end_d + \
#                                     relativedelta(months=months_between)
#                             current_date = start_date
#                             while current_date < end_date:

#                                 if current_date.year == end_date.year and current_date.month == end_date.month:
#                                     if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
#                                         current_date += relativedelta(months=1)
#                                         break
                                
#                                 if current_date.day != start_date.day:
#                                     # If current_date not the same as date1.day, change it to the same day as date1.day
#                                     try:
#                                         current_date = current_date.replace(day=start_date.day)
#                                     except:
#                                         last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day

#                                         current_date = current_date.replace(day=last_day_of_month)

#                                 arr_dic = {}
#                                 arr_dic['date'] = current_date.strftime(
#                                     "%b %y")
#                                 bol = False
#                                 pending_arr = False
#                                 if current_date >= item.s_end_d:
#                                     bol = True
#                                     pending_arr = True
#                                 arr_dic['update'] = bol
#                                 arr_dic['value'] = value
#                                 arr_dic['pending_arr'] = pending_arr
#                                 new_arr.append(arr_dic)
#                                 current_date += relativedelta(months=1)
#                             calc.arr = new_arr
#                             calc.save()

#                         except Exception as e:
#                             print(e, "=-=-=--==-")
#             # -----------------------------by month-----------------------------------
#                         try:
#                             calc = CalculationMonths.objects.get(items=item)
#                             arr = calc.arr
#                             new_arr = []
#                             leng = len(arr)
#                             value = arr[leng-1]['value']
#                             start_date = item.s_start_d
#                             if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
#                                 end_date = item.s_end_d + \
#                                     relativedelta(
#                                         months=months_between, day=31)
#                             else:
#                                 end_date = item.s_end_d + \
#                                     relativedelta(months=months_between)
                            
#                             current_date = start_date
#                             while current_date < end_date:
#                                 if current_date.year == end_date.year and current_date.month == end_date.month:
#                                     if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
#                                         current_date += relativedelta(months=1)
#                                         break
                                
#                                 if current_date.day != start_date.day:
#                                     # If current_date not the same as date1.day, change it to the same day as date1.day
#                                     try:
#                                         current_date = current_date.replace(day=start_date.day)
#                                     except:
#                                         last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day

#                                         current_date = current_date.replace(day=last_day_of_month)

#                                 arr_dic = {}
#                                 bol = False
#                                 pending_arr = False
#                                 arr_dic['date'] = current_date.strftime(
#                                     "%b %y")
#                                 # if current_date > item.s_end_d or (current_date.month == item.s_end_d.month and current_date.year == item.s_end_d.year):
#                                 if current_date >= item.s_end_d:
#                                     bol = True
#                                     pending_arr = True
#                                 arr_dic['update'] = bol
#                                 arr_dic['value'] = value
#                                 arr_dic['pending_arr'] = pending_arr
#                                 new_arr.append(arr_dic)
#                                 current_date += relativedelta(months=1)
#                             calc.arr = new_arr
#                             calc.save()
#                         except Exception as e:
#                             print(e, "before-0909099090")

#                 else:
#                     smallest_start_date = min(filter(None, start_dates))
#                     if smallest_start_date is None:
#                         smallest_start_date = items[index-1].s_start_d.year
#                     difference = relativedelta(
#                         smallest_start_date, item.s_end_d)
#                     # months = difference.years * 12 + difference.months+1
#                     # months = items[index-1].s_start_d.month - \
#                         # item.s_end_d.month
#                     year = smallest_start_date.year - item.s_end_d.year
#                     days_difference = (difference.years * 365) + \
#                         (difference.months * 30) + difference.days
#                     r = 1

#                     calc = Calculation.objects.get(items=item)
#                     last_arr = calc.arr[len(calc.arr)-1]
#                     last_date = last_arr['date']
#                     last_date = datetime.strptime(last_date, "%b %y")

#                     months = (smallest_start_date.year - last_date.year) * \
#                         12 + smallest_start_date.month - \
#                         last_date.month - 1

#                     if item.s_end_d.month - last_date.month > 0:
#                         enter = 1
                    
#                     if calendar.monthrange(current_date.year, current_date.month)[1] <= item.s_end_d.day:
#                         if year <= 0 and months <= 1:
#                             months_between = 0
#                         if months > 1 and year >= 0:
#                             r = 0
#                             months_between = months
#                         if months > 3 and year >= 0:
#                             months_between = grace_period.months
#                         if year > 0:
#                             r = 0
#                             months_between = grace_period.months
#                         if year < 0:
#                             months_between = 0
#                     else:
#                         if year <= 0 and months <= 0:
#                             months_between = 0
#                         if months > 0 and year >= 0:
#                             r = 0
#                             months_between = months
#                         if months > 3 and year >= 0:
#                             months_between = grace_period.months
#                         if year > 0:
#                             r = 0     
#                             months_between = grace_period.months
#                         if year < 0:
#                             months_between = 0
#                     if months > 0:
#                         r = 0
#                         months_between = months

#                     if months_between > 3:
#                         months_between = grace_period.months

#                     if months <= 0:
#                         months_between = 0

#                     # print(items[index-1].s_start_d, "-----------------", item.s_end_d)
#                     # print(months_between, "::::::::::::::::::::::::::::::", months)
#                     # if months > 1 or (year > 0 and months >= 0):
#                     if months_between > 0:
#                         try:
#                             calc = Calculation.objects.get(items=item)
#                             arr = calc.arr
#                             new_arr = []
#                             leng = len(arr)
#                             value = arr[leng-1]['value']
#                             start_date = item.s_start_d
#                             if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
#                                 end_date = item.s_end_d + \
#                                     relativedelta(
#                                         months=months_between, day=31)
#                             else:
#                                 end_date = item.s_end_d + \
#                                     relativedelta(months=months_between)
#                             current_date = start_date
#                             while current_date < end_date:
#                                 if current_date.year == end_date.year and current_date.month == end_date.month:
#                                     if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
#                                         current_date += relativedelta(months=1)
#                                         break

#                                 if current_date.day != start_date.day:
#                                     # If current_date not the same as date1.day, change it to the same day as date1.day
#                                     try:
#                                         current_date = current_date.replace(day=start_date.day)
#                                     except:
#                                         last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day

#                                         current_date = current_date.replace(day=last_day_of_month)
                                
#                                 arr_dic = {}
#                                 arr_dic['date'] = current_date.strftime(
#                                     "%b %y")
#                                 bol = False
#                                 pending_arr = False
#                                 # print(items[index-1].s_start_d.month - last_date.month, "---------------------------------")
#                                 # print(current_date.year,"ddddddddddd", item.s_end_d.year, "fdddddddddddd", item.s_end_d.month, "fffffffffff", end_date.month)
#                                 if current_date >= item.s_end_d or (current_date.year == item.s_end_d.year and item.s_end_d.month == current_date.month and enter == 1):
#                                 # if current_date >= item.s_end_d:
#                                     bol = True
#                                     pending_arr = True
#                                     enter = 0
#                                 arr_dic['update'] = bol
#                                 arr_dic['value'] = value
#                                 arr_dic['pending_arr'] = pending_arr
#                                 new_arr.append(arr_dic)
#                                 current_date += relativedelta(months=1)
#                             calc.arr = new_arr
#                             calc.save()

#                         except Exception as e:
#                             print(e, "=-=-=--==-")
#         # -----------------------------by month-----------------------------------
#                         try:
#                             calc = CalculationMonths.objects.get(items=item)
#                             arr = calc.arr
#                             new_arr = []
#                             leng = len(arr)
#                             value = arr[leng-1]['value']
#                             start_date = item.s_start_d
#                             if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
#                                 end_date = item.s_end_d + \
#                                     relativedelta(months=months_between, day=31)
#                             else:
#                                 end_date = item.s_end_d + \
#                                     relativedelta(months=months_between)
#                             current_date = start_date
#                             while current_date < end_date:
#                                 if current_date.year == end_date.year and current_date.month == end_date.month:
#                                     if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
#                                         current_date += relativedelta(months=1)
#                                         break
                                
#                                 if current_date.day != start_date.day:
#                                     # If current_date not the same as date1.day, change it to the same day as date1.day
#                                     try:
#                                         current_date = current_date.replace(day=start_date.day)
#                                     except:
#                                         last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day

#                                         current_date = current_date.replace(day=last_day_of_month)

#                                 arr_dic = {}
#                                 bol = False
#                                 pending_arr = False
#                                 arr_dic['date'] = current_date.strftime("%b %y")
#                                 # if current_date > item.s_end_d or (current_date.month == item.s_end_d.month and current_date.year == item.s_end_d.year):
#                                 if current_date >= item.s_end_d:
#                                     bol = True
#                                     pending_arr = True
#                                 arr_dic['update'] = bol
#                                 arr_dic['value'] = value
#                                 arr_dic['pending_arr'] = pending_arr
#                                 new_arr.append(arr_dic)
#                                 current_date += relativedelta(months=1)
#                             calc.arr = new_arr
#                             calc.save()
#                         except Exception as e:
#                             print(e, "0909099090")
#             except Exception as e:
#                 print(e, "lllllllllll")
            
#             start_dates.append(item.s_start_d)


#         # print(tsc.customer_name)
#         # if "Manheim Township (PA) Fire Rescue" == tsc.customer_name:
#         #     print("break break break break break break break ")
#         #     break
