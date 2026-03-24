
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

# -----------------------signal for Calculation after update and create----------------------------------


@receiver(post_save, sender=Item)
def calculation_on_item_save(sender, instance, created, **kwargs):
    # Your signal logic goes here
    if created:
        print("A new instance of MyModel has been created.")

        # by day calling function
        obj = instance
        rev = revenue(obj)
        bill = billing(obj)
        def_rev = deferred_revenue(obj)

        # by month calling function
        rev_mth = revenue_month.revenue(obj)
        bill_mth = revenue_month.billing(obj)
        def_rev_mth = revenue_month.deferred_revenue(obj)

        if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
            arr = item_arr(obj)
            arr_mth = revenue_month.item_arr(obj)

            # by day creating object
            Calculation.objects.create(items=obj, revenue=rev,
                                       deffered_revenue=def_rev, billing=bill,
                                       arr=arr
                                       )

            # by month creating object
            CalculationMonths.objects.create(items=obj, revenue=rev_mth,
                                             deffered_revenue=def_rev_mth, billing=bill_mth,
                                             arr=arr_mth
                                             )
        else:
            Calculation.objects.create(items=obj, revenue=rev,
                                       deffered_revenue=def_rev, billing=bill
                                       )

            # by month creating object
            CalculationMonths.objects.create(items=obj, revenue=rev_mth,
                                             deffered_revenue=def_rev_mth, billing=bill_mth
                                             )

    else:
        # by day calling function
        obj = instance
        rev = revenue(obj)
        bill = billing(obj)
        def_rev = deferred_revenue(obj)

# -----------------------by month calling function---------------------
        rev_mth = revenue_month.revenue(obj)
        bill_mth = revenue_month.billing(obj)
        def_rev_mth = revenue_month.deferred_revenue(obj)

        try:
            calculation = Calculation.objects.get(items=obj)
            if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
                arr = item_arr(obj)
                print(arr)
                calculation.revenue = rev
                calculation.billing = bill
                calculation.deffered_revenue = def_rev
                calculation.arr = arr
                calculation.save()
            else:
                calculation.revenue = rev
                calculation.billing = bill
                calculation.deffered_revenue = def_rev
                calculation.save()
        except:
            if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
                arr = item_arr(obj)
                Calculation.objects.create(items=obj, revenue=rev,
                                           deffered_revenue=def_rev, billing=bill,
                                           arr=arr
                                           )
            else:
                Calculation.objects.create(items=obj, revenue=rev,
                                           deffered_revenue=def_rev, billing=bill
                                           )
# -----------------------------by month-----------------------------------
        try:
            calculation = CalculationMonths.objects.get(items=obj)
            if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
                arr_mth = revenue_month.item_arr(obj)
                calculation.revenue = rev_mth
                calculation.billing = bill_mth
                calculation.deffered_revenue = def_rev_mth
                calculation.arr = arr_mth
                calculation.save()
            else:
                calculation.revenue = rev_mth
                calculation.billing = bill_mth
                calculation.deffered_revenue = def_rev_mth
                calculation.save()
        except:
            if obj.productp_service.revenue_type.revenue_type == "over life of subscription":
                arr_mth = revenue_month.item_arr(obj)
                CalculationMonths.objects.create(items=obj, revenue=rev_mth,
                                                 deffered_revenue=def_rev_mth, billing=bill_mth,
                                                 arr=arr_mth
                                                 )
            else:
                CalculationMonths.objects.create(items=obj, revenue=rev_mth,
                                                 deffered_revenue=def_rev_mth, billing=bill_mth
                                                 )
        print("An instance of MyModel has been updated.")


arr_grace_period_signal = Signal()


@receiver(arr_grace_period_signal)
def calculation_on_arr_grace_period_handler(sender, instance, created, user, **kwargs):
    # Your signal logic goes here
    print("A new instance of MyModel has been created.")
    threading.Thread(target=arr_grace, args=[user]).start()


def arr_grace(user):
    item_ids = Item.objects.filter(tansaction__user__company=user.company,
                                   productp_service__revenue_type__revenue_type="over life of subscription").values('tansaction_id')
    grace_period = ArrGracePeriod.objects.filter(company=user.company).first()
    transaction = Transaction.objects.filter(id__in=item_ids).order_by(
        'customer_name').distinct('customer_name')
    for tsc in transaction:
        months_between = grace_period.months
        r = 0
        # items = Item.objects.filter(tansaction__customer_name=tsc.customer_name)
        items = Item.objects.filter(tansaction__customer_name=tsc.customer_name,
                                    productp_service__revenue_type__revenue_type="over life of subscription").order_by('-s_start_d')
        for index, item in enumerate(items):
            try:
                if (index == 0 or (index >= 1 and items[index-1].s_end_d.month == item.s_end_d.month and items[index-1].s_end_d.year == item.s_end_d.year)) and r == 0:
                    
                    print("(((((((((((((((((())))))))))))))))))")
                    if months_between > 0:
                        try:
                            calc = Calculation.objects.get(items=item)
                            arr = calc.arr
                            new_arr = []
                            leng = len(arr)
                            value = arr[leng-1]['value']
                            start_date = item.s_start_d
                            if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
                                end_date = item.s_end_d + \
                                    relativedelta(
                                        months=months_between, day=31)
                            else:
                                end_date = item.s_end_d + \
                                    relativedelta(months=months_between)
                            current_date = start_date
                            while current_date < end_date:

                                if current_date.year == end_date.year and current_date.month == end_date.month:
                                    if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
                                        current_date += relativedelta(months=1)
                                        break
                                
                                if current_date.day != start_date.day:
                                    # If current_date not the same as date1.day, change it to the same day as date1.day
                                    try:
                                        current_date = current_date.replace(day=start_date.day)
                                    except:
                                        last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day

                                        current_date = current_date.replace(day=last_day_of_month)

                                arr_dic = {}
                                arr_dic['date'] = current_date.strftime(
                                    "%b %y")
                                bol = False
                                pending_arr = False
                                if current_date >= item.s_end_d:
                                    bol = True
                                    pending_arr = True
                                arr_dic['update'] = bol
                                arr_dic['value'] = value
                                arr_dic['pending_arr'] = pending_arr
                                new_arr.append(arr_dic)
                                current_date += relativedelta(months=1)
                            calc.arr = new_arr
                            calc.save()

                        except Exception as e:
                            print(e, "=-=-=--==-")
            # -----------------------------by month-----------------------------------
                        try:
                            calc = CalculationMonths.objects.get(items=item)
                            arr = calc.arr
                            new_arr = []
                            leng = len(arr)
                            value = arr[leng-1]['value']
                            start_date = item.s_start_d
                            if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
                                end_date = item.s_end_d + \
                                    relativedelta(
                                        months=months_between, day=31)
                            else:
                                end_date = item.s_end_d + \
                                    relativedelta(months=months_between)
                            
                            current_date = start_date
                            while current_date < end_date:
                                if current_date.year == end_date.year and current_date.month == end_date.month:
                                    if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
                                        current_date += relativedelta(months=1)
                                        break
                                
                                if current_date.day != start_date.day:
                                    # If current_date not the same as date1.day, change it to the same day as date1.day
                                    try:
                                        current_date = current_date.replace(day=start_date.day)
                                    except:
                                        last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day

                                        current_date = current_date.replace(day=last_day_of_month)

                                arr_dic = {}
                                bol = False
                                pending_arr = False
                                arr_dic['date'] = current_date.strftime(
                                    "%b %y")
                                # if current_date > item.s_end_d or (current_date.month == item.s_end_d.month and current_date.year == item.s_end_d.year):
                                if current_date >= item.s_end_d:
                                    bol = True
                                    pending_arr = True
                                arr_dic['update'] = bol
                                arr_dic['value'] = value
                                arr_dic['pending_arr'] = pending_arr
                                new_arr.append(arr_dic)
                                current_date += relativedelta(months=1)
                            calc.arr = new_arr
                            calc.save()
                        except Exception as e:
                            print(e, "before-0909099090")

                else:
                    difference = relativedelta(
                        items[index-1].s_start_d, item.s_end_d)
                    # months = difference.years * 12 + difference.months+1
                    # months = items[index-1].s_start_d.month - \
                        # item.s_end_d.month
                    year = items[index-1].s_start_d.year - item.s_end_d.year
                    days_difference = (difference.years * 365) + \
                        (difference.months * 30) + difference.days
                    r = 1

                    calc = Calculation.objects.get(items=item)
                    last_arr = calc.arr[len(calc.arr)-1]
                    last_date = last_arr['date']
                    last_date = datetime.strptime(last_date, "%b %y")

                    print(items[index-1].s_start_d , "KKKKKK",last_date.month,"KKKK", last_date)
                    months = (items[index-1].s_start_d.year - last_date.year) * \
                        12 + items[index-1].s_start_d.month - \
                        last_date.month - 1
                    print(months, "OOOOOOOOOOOOOOOOOOOOOOOO")

                    if item.s_end_d.month - last_date.month > 0:
                        enter = 1
                    
                    if calendar.monthrange(current_date.year, current_date.month)[1] <= item.s_end_d.day:
                        if year <= 0 and months <= 1:
                            months_between = 0
                        if months > 1 and year >= 0:
                            r = 0
                            months_between = months
                        if months > 3 and year >= 0:
                            months_between = grace_period.months
                        if year > 0:
                            r = 0
                            months_between = grace_period.months
                        if year < 0:
                            months_between = 0
                    else:
                        if year <= 0 and months <= 0:
                            months_between = 0
                        if months > 0 and year >= 0:
                            r = 0
                            months_between = months
                        if months > 3 and year >= 0:
                            months_between = grace_period.months
                        if year > 0:
                            r = 0     
                            months_between = grace_period.months
                        if year < 0:
                            months_between = 0
                    if months > 0:
                        r = 0
                        months_between = months

                    if months_between > 3:
                        months_between = grace_period.months

                    if months <= 0:
                        months_between = 0

                    # print(items[index-1].s_start_d, "-----------------", item.s_end_d)
                    # print(months_between, "::::::::::::::::::::::::::::::", months)
                    # if months > 1 or (year > 0 and months >= 0):
                    print(months_between, ":::::::::::::::::::",months)
                    if months_between > 0:
                        try:
                            calc = Calculation.objects.get(items=item)
                            arr = calc.arr
                            new_arr = []
                            leng = len(arr)
                            value = arr[leng-1]['value']
                            start_date = item.s_start_d
                            if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
                                end_date = item.s_end_d + \
                                    relativedelta(
                                        months=months_between, day=31)
                            else:
                                end_date = item.s_end_d + \
                                    relativedelta(months=months_between)
                            current_date = start_date
                            while current_date < end_date:
                                if current_date.year == end_date.year and current_date.month == end_date.month:
                                    if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
                                        current_date += relativedelta(months=1)
                                        break

                                if current_date.day != start_date.day:
                                    # If current_date not the same as date1.day, change it to the same day as date1.day
                                    try:
                                        current_date = current_date.replace(day=start_date.day)
                                    except:
                                        last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day

                                        current_date = current_date.replace(day=last_day_of_month)
                                
                                arr_dic = {}
                                arr_dic['date'] = current_date.strftime(
                                    "%b %y")
                                bol = False
                                pending_arr = False
                                # print(items[index-1].s_start_d.month - last_date.month, "---------------------------------")
                                # print(current_date.year,"ddddddddddd", item.s_end_d.year, "fdddddddddddd", item.s_end_d.month, "fffffffffff", end_date.month)
                                if current_date >= item.s_end_d or (current_date.year == item.s_end_d.year and item.s_end_d.month == current_date.month and enter == 1):
                                # if current_date >= item.s_end_d:
                                    print("aja aja ja aja jaj aja ja aj aj aaj a")
                                    bol = True
                                    pending_arr = True
                                    enter = 0
                                arr_dic['update'] = bol
                                arr_dic['value'] = value
                                arr_dic['pending_arr'] = pending_arr
                                new_arr.append(arr_dic)
                                current_date += relativedelta(months=1)
                            calc.arr = new_arr
                            calc.save()

                        except Exception as e:
                            print(e, "=-=-=--==-")
        # -----------------------------by month-----------------------------------
                        try:
                            calc = CalculationMonths.objects.get(items=item)
                            arr = calc.arr
                            new_arr = []
                            leng = len(arr)
                            value = arr[leng-1]['value']
                            start_date = item.s_start_d
                            if calendar.monthrange(item.s_end_d.year, item.s_end_d.month)[1] <= item.s_end_d.day:
                                end_date = item.s_end_d + \
                                    relativedelta(months=months_between, day=31)
                            else:
                                end_date = item.s_end_d + \
                                    relativedelta(months=months_between)
                            current_date = start_date
                            while current_date < end_date:
                                if current_date.year == end_date.year and current_date.month == end_date.month:
                                    if calendar.monthrange(current_date.year, current_date.month)[1] > end_date.day:
                                        current_date += relativedelta(months=1)
                                        break
                                
                                if current_date.day != start_date.day:
                                    # If current_date not the same as date1.day, change it to the same day as date1.day
                                    try:
                                        current_date = current_date.replace(day=start_date.day)
                                    except:
                                        last_day_of_month = (current_date.replace(day=1) + relativedelta(months=1, days=-1)).day

                                        current_date = current_date.replace(day=last_day_of_month)

                                arr_dic = {}
                                bol = False
                                pending_arr = False
                                arr_dic['date'] = current_date.strftime("%b %y")
                                # if current_date > item.s_end_d or (current_date.month == item.s_end_d.month and current_date.year == item.s_end_d.year):
                                if current_date >= item.s_end_d:
                                    bol = True
                                    pending_arr = True
                                arr_dic['update'] = bol
                                arr_dic['value'] = value
                                arr_dic['pending_arr'] = pending_arr
                                new_arr.append(arr_dic)
                                current_date += relativedelta(months=1)
                            calc.arr = new_arr
                            calc.save()
                        except Exception as e:
                            print(e, "0909099090")
            except Exception as e:
                print(e, "lllllllllll")

        # print(tsc.customer_name)
        # if "Beavercreek Township (OH) Fire Department" == tsc.customer_name:
        #     print("break break break break break break break ")
        #     break
