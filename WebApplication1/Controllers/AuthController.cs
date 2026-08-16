using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Helpers;
using System.Web.Mvc;
using WebApplication1.Models;
using WebApplication1.Models.Context;
using WebApplication1.Models.Tables;
using WebApplication1.Services;

namespace WebApplication1.Controllers
{
    public class AuthController : Controller
    {
        // GET: Auth
        public JsonResult Login(LoginModelDTO data)
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    // Check admin table first
                    var admin = connect.admin.Where(x =>
                        x.email == data.email &&
                        x.password == data.password
                    ).FirstOrDefault();

                    if (admin != null)
                    {
                        string code = new Random().Next(100000, 999999).ToString();
                        Session["VerificationCode"] = code;
                        Session["VerifyEmail"] = data.email;
                        Session["VerifyExpiry"] = DateTime.Now.AddMinutes(5);
                        Session["UserRole"] = 1; // Admin
                        EmailServices.SendEmailVerification(data.email, code);
                        TempData["Email"] = data.email;
                        return Json(new { success = true, role = 1, message = "Verification code sent to " + data.email }, JsonRequestBehavior.AllowGet);
                    }

                    // Check tenant table
                    var tenant = connect.tenant.Where(x =>
                        x.email == data.email &&
                        x.passwordHash == data.password
                    ).FirstOrDefault();

                    if (tenant != null)
                    {
                        string code = new Random().Next(100000, 999999).ToString();
                        Session["VerificationCode"] = code;
                        Session["VerifyEmail"] = data.email;
                        Session["VerifyExpiry"] = DateTime.Now.AddMinutes(5);
                        Session["UserRole"] = 2; // Tenant
                        EmailServices.SendEmailVerification(data.email, code);
                        TempData["Email"] = data.email;
                        return Json(new { success = true, role = 2, message = "Verification code sent to " + data.email }, JsonRequestBehavior.AllowGet);
                    }

                    return Json(new { success = false, message = "User not found." }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) }, JsonRequestBehavior.AllowGet);
            }
        }
        public JsonResult VerifyCode(verifycode data)
        {
            try
            {
                string savedCode = Session["VerificationCode"] as string;
                DateTime? expiry = Session["VerifyExpiry"] as DateTime?;

                if (savedCode == null || expiry == null)
                    return Json(new { success = false, message = "Session Expired" }, JsonRequestBehavior.AllowGet);

                if (DateTime.Now > expiry)
                    return Json(new { success = false, message = "Code Has Expired" }, JsonRequestBehavior.AllowGet);

                if (data.code != savedCode)
                    return Json(new { success = false, message = "Invalid Code" }, JsonRequestBehavior.AllowGet);

                Session["IsAuthenticated"] = true;

                // ✅ Set LoggedInTid so TenantPortal can identify the user
                int userRole = Convert.ToInt32(Session["UserRole"]);
                if (userRole == 2)
                {
                    string email = Session["VerifyEmail"] as string;
                    using (var connect = new DB_Context())
                    {
                        var tenant = connect.tenant.FirstOrDefault(x => x.email == email);

                        // If tenant is found, use their Tid. Otherwise, default to 1.
                        if (tenant != null)
                        {
                            Session["LoggedInTid"] = tenant.Tid;
                        }
                        else
                        {
                            Session["LoggedInTid"] = 1;
                        }
                    }
                }

                return Json(new { success = true, role = userRole }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) });
            }
        }


        // ============================================================
        // 1. SEND OTP
        // ============================================================
        [HttpPost]
        public JsonResult SendVisitorOtp(VisitorAuthDTO data)
        {
            try
            {
                if (data == null || string.IsNullOrWhiteSpace(data.name))
                    return Json(new { success = false, message = "Full name is required." });

                if (string.IsNullOrWhiteSpace(data.email) || !data.email.Contains("@"))
                    return Json(new { success = false, message = "Valid email is required." });

                if (string.IsNullOrWhiteSpace(data.phone))
                    return Json(new { success = false, message = "Phone number is required." });

                string code = new Random().Next(100000, 999999).ToString();

                // Held separately from the verified keys until the code checks out
                Session["VisitorCode"] = code;
                Session["VisitorExpiry"] = DateTime.Now.AddMinutes(5);
                Session["PendingVisitorName"] = data.name.Trim();
                Session["PendingVisitorEmail"] = data.email.Trim();
                Session["PendingVisitorPhone"] = data.phone.Trim();

                EmailServices.SendEmailVerification(data.email.Trim(), code);

                return Json(new { success = true, message = "Verification code sent to " + data.email });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


        // ============================================================
        // 2. VERIFY OTP
        // ============================================================
        [HttpPost]
        public JsonResult VerifyVisitorOtp(string code)
        {
            try
            {
                string savedCode = Session["VisitorCode"] as string;
                DateTime? expiry = Session["VisitorExpiry"] as DateTime?;

                if (savedCode == null || expiry == null)
                    return Json(new { success = false, message = "Session expired. Please start again." });

                if (DateTime.Now > expiry)
                    return Json(new { success = false, message = "Code has expired. Please resend." });

                if (code != savedCode)
                    return Json(new { success = false, message = "Incorrect code. Please try again." });

                // Promote pending details to verified
                Session["VisitorName"] = Session["PendingVisitorName"];
                Session["VisitorEmail"] = Session["PendingVisitorEmail"];
                Session["VisitorPhone"] = Session["PendingVisitorPhone"];
                Session["VisitorVerified"] = true;

                Session["VisitorCode"] = null;
                Session["VisitorExpiry"] = null;

                return Json(new
                {
                    success = true,
                    name = Session["VisitorName"],
                    email = Session["VisitorEmail"],
                    phone = Session["VisitorPhone"]
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


        // ============================================================
        // 3. CURRENT VISITOR  (so the modal can skip straight to the calendar)
        // ============================================================
        [HttpGet]
        public JsonResult GetVisitorSession()
        {
            bool verified = Session["VisitorVerified"] != null && (bool)Session["VisitorVerified"];

            return Json(new
            {
                success = true,
                verified = verified,
                name = verified ? Session["VisitorName"] : null,
                email = verified ? Session["VisitorEmail"] : null,
                phone = verified ? Session["VisitorPhone"] : null
            }, JsonRequestBehavior.AllowGet);
        }


        // ============================================================
        // 4. SWITCH ACCOUNT
        // ============================================================
        [HttpPost]
        public JsonResult ClearVisitorSession()
        {
            Session["VisitorVerified"] = null;
            Session["VisitorName"] = null;
            Session["VisitorEmail"] = null;
            Session["VisitorPhone"] = null;
            Session["VisitorCode"] = null;
            Session["VisitorExpiry"] = null;

            return Json(new { success = true });
        }


        // ============================================================
        // 5. AVAILABILITY  (busy days + taken slots, no guest details exposed)
        // ============================================================
        [HttpGet]
        public JsonResult GetBookingAvailability()
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    var busyDates = connect.busy_schedule
                        .ToList()
                        .Select(b => b.busyDate.ToString("yyyy-MM-dd"))
                        .Distinct()
                        .ToList();

                    // Only what the calendar needs. No names, emails or phones.
                    var taken = connect.booking
                        .Where(b => b.status == "Pending" || b.status == "Confirmed")
                        .ToList()
                        .Select(b => new
                        {
                            date = b.bookingDatetime.ToString("yyyy-MM-dd"),
                            hour = b.bookingDatetime.Hour
                        })
                        .ToList();

                    return Json(new
                    {
                        success = true,
                        busyDates = busyDates,
                        taken = taken
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message },
                            JsonRequestBehavior.AllowGet);
            }
        }


        // ============================================================
        // 6. SUBMIT BOOKING
        // ============================================================
        [HttpPost]
        public JsonResult SubmitVisitorBooking(VisitorBookingDTO data)
        {
            try
            {
                bool verified = Session["VisitorVerified"] != null && (bool)Session["VisitorVerified"];
                if (!verified)
                    return Json(new { success = false, message = "Please verify your email first." });

                int selectedUid;
                var rawUid = Session["SelectedUid"];
                if (rawUid == null || !int.TryParse(rawUid.ToString(), out selectedUid))
                    return Json(new { success = false, message = "No unit selected." });

                if (data == null || string.IsNullOrWhiteSpace(data.date) || string.IsNullOrWhiteSpace(data.slot))
                    return Json(new { success = false, message = "Please pick a date and time slot." });

                // ---- Build the datetime from "yyyy-MM-dd" + "08:00 AM" ----
                DateTime bookingDate;
                if (!DateTime.TryParse(data.date, out bookingDate))
                    return Json(new { success = false, message = "Invalid date." });

                int hour = ParseSlotHour(data.slot);
                var bookingDatetime = bookingDate.Date.AddHours(hour);

                if (bookingDatetime < DateTime.Now)
                    return Json(new { success = false, message = "That time slot is already in the past." });

                string name = Session["VisitorName"] as string;
                string email = Session["VisitorEmail"] as string;
                string phone = Session["VisitorPhone"] as string;

                using (var connect = new DB_Context())
                {
                    var unit = connect.unit.FirstOrDefault(u => u.Uid == selectedUid);
                    if (unit == null)
                        return Json(new { success = false, message = "Unit not found." });

                    // ---- Admin busy day ----
                    var dayStart = bookingDatetime.Date;
                    var dayEnd = dayStart.AddDays(1);

                    bool isBusy = connect.busy_schedule
                        .Any(b => b.busyDate >= dayStart && b.busyDate < dayEnd);

                    if (isBusy)
                        return Json(new { success = false, message = "That day is unavailable for viewings." });

                    // ---- Monthly limit: 2 per email per calendar month ----
                    int monthCount = connect.booking
                        .Count(b => b.guestEmail == email
                                    && b.bookingDatetime.Year == bookingDatetime.Year
                                    && b.bookingDatetime.Month == bookingDatetime.Month);

                    if (monthCount >= 2)
                        return Json(new { success = false, message = "You have reached the maximum of 2 bookings this month." });

                    // ---- Conflict: any live booking within 60 minutes, any unit ----
                    var windowStart = bookingDatetime.AddMinutes(-59);
                    var windowEnd = bookingDatetime.AddMinutes(59);

                    bool conflict = connect.booking
                        .Any(b => (b.status == "Pending" || b.status == "Confirmed")
                                  && b.bookingDatetime >= windowStart
                                  && b.bookingDatetime <= windowEnd);

                    if (conflict)
                        return Json(new { success = false, message = "That time slot is no longer available. Please choose another." });

                    // ---- Save ----
                    var booking = new booking
                    {
                        Uid = selectedUid,
                        guestName = name,
                        guestEmail = email,
                        guestPhone = phone,
                        bookingDatetime = bookingDatetime,
                        status = "Pending",
                        notes = data.notes
                    };

                    connect.booking.Add(booking);
                    connect.SaveChanges();

                    // Receipt email. Don't fail the booking if SMTP is down.
                    try
                    {
                        EmailServices.SendBookingReceipt(email, name, unit.unitName, bookingDatetime, data.notes);
                    }
                    catch { }

                    return Json(new
                    {
                        success = true,
                        message = "Booking submitted successfully!",
                        unitName = unit.unitName,
                        datetime = bookingDatetime.ToString("MMMM dd, yyyy hh:mm tt")
                    });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }


        // Turns "08:00 AM" / "01:00 PM" into a 24-hour integer
        private int ParseSlotHour(string slot)
        {
            var parts = slot.Trim().Split(' ');
            int hour = int.Parse(parts[0].Split(':')[0]);

            if (parts.Length > 1 && parts[1].ToUpper() == "PM" && hour != 12) hour += 12;
            if (parts.Length > 1 && parts[1].ToUpper() == "AM" && hour == 12) hour = 0;

            return hour;
        }



        public string ErrorHandling(Exception ex)
        {
            var errorMessage = $@"
            ===== ERROR DETAILS =====
            Message        : {ex.Message}
            Type           : {ex.GetType().FullName}
            Source         : {ex.Source}
            Stack Trace    : {ex.StackTrace}
            Inner Exception: {(ex.InnerException != null ? ex.InnerException.Message : "None")}
            Timestamp      : {DateTime.Now:yyyy-MM-dd HH:mm:ss}
            =========================";

            return errorMessage;
        }
    }
}