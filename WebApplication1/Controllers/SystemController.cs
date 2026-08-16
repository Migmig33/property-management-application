using Microsoft.Ajax.Utilities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Helpers;
using System.Web.Mvc;
using WebApplication1;
using WebApplication1.Models.Context;
using WebApplication1.Models.Tables;
using WebApplication1.Services;
using static WebApplication1.Services.NotificationChecker;
namespace WebApplication1.Controllers
{
    public class SystemController : Controller
    {
        // GET: System
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult RentersBrowse()
        {
            return View("Renters/Browse");
        }
        public ActionResult RentersBookings()
        {
            return View("Renters/MyBookings");
        }
        public ActionResult RentersUnitDetails()
        {
            return View("Renters/UnitDetails");

        }
        public ActionResult Dashboard()
        {
            return View("Admin/Dashboard");
        }
        public ActionResult Units()
        {
            return View("Admin/Units");
        }
        public ActionResult Tenants()
        {
            return View("Admin/Tenants");
        }
        public ActionResult Bookings()
        {
            return View("Admin/Bookings");
        }
        public ActionResult Maintenance()
        {
            return View("Admin/Maintenance");
        }
        public ActionResult Payments()
        {
            return View("Admin/Payments");
        }
        public ActionResult Auth()
        {
            return View();
        }
        public ActionResult TenantPortal()
        {
            return View();
        }
        // POST API
        [HttpPost]
        public JsonResult UploadVideo(HttpPostedFileBase video)
        {
            try
            {
                if (video == null || video.ContentLength == 0)
                    return Json(new { success = false, message = "No video file received" }, JsonRequestBehavior.AllowGet);

                // Validate file type
                var allowedTypes = new[] { "video/mp4", "video/webm", "video/ogg" };
                if (!allowedTypes.Contains(video.ContentType))
                    return Json(new { success = false, message = "Invalid video file type" }, JsonRequestBehavior.AllowGet);

                // Save to /Uploads/Videos/
                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(video.FileName);
                var folderPath = Server.MapPath("~/Uploads/Videos/");

                if (!Directory.Exists(folderPath))
                    Directory.CreateDirectory(folderPath);

                var filePath = Path.Combine(folderPath, fileName);
                video.SaveAs(filePath);

                // ✅ Return the accessible URL
                var videoUrl = "/Uploads/Videos/" + fileName;
                return Json(new { success = true, videoUrl = videoUrl }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult SaveTenant(tenant tenantData, List<co_occupant> coOccupants,
                                     List<IdFileDto> idFiles, List<int> deletedDocumentIds, int? id)
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    var existingTenant = connect.tenant.FirstOrDefault(x => x.Tid == id);

                    // ========================================================
                    // INSERT
                    // ========================================================
                    if (existingTenant == null)
                    {
                        string newTenantNumber = tenantData.tenantNumber;
                        if (string.IsNullOrEmpty(newTenantNumber))
                            newTenantNumber = "T-" + DateTime.Now.ToString("yyyyMMddHHmm");

                        var newTenant = new tenant
                        {
                            tenantNumber = newTenantNumber,
                            name = tenantData.name,
                            email = tenantData.email,
                            phone = tenantData.phone,
                            address = tenantData.address,
                            occupation = tenantData.occupation,
                            occupancyTypeId = tenantData.occupancyTypeId,
                            passwordHash = tenantData.passwordHash,
                            unitId = tenantData.unitId,
                            status = "Active",
                            isTerminated = 0,
                            leaseStart = tenantData.leaseStart,
                            leaseEnd = tenantData.leaseEnd
                        };

                        connect.tenant.Add(newTenant);
                        connect.SaveChanges();

                        // ---- Mark the unit occupied and create the first bill ----
                        if (newTenant.unitId > 0)
                        {
                            var assignedUnit = connect.unit.FirstOrDefault(u => u.Uid == newTenant.unitId);
                            if (assignedUnit != null)
                            {
                                assignedUnit.status = "active";

                                connect.payment.Add(new payment
                                {
                                    Tid = newTenant.Tid,
                                    Uid = assignedUnit.Uid,
                                    amount = assignedUnit.price,
                                    dueDate = DateTime.Now,
                                    paidDate = DateTime.Now,
                                    billingPeriod = DateTime.Now.ToString("MMMM yyyy")
                                });

                                connect.SaveChanges();
                            }
                        }

                        // ---- Co-occupants ----
                        if (newTenant.occupancyTypeId == 2 && coOccupants != null)
                        {
                            foreach (var occ in coOccupants)
                            {
                                connect.co_occupant.Add(new co_occupant
                                {
                                    Tid = newTenant.Tid,
                                    name = occ.name,
                                    phone = occ.phone,
                                    address = occ.address
                                });
                            }
                            connect.SaveChanges();
                        }

                        // ---- ID documents ----
                        if (idFiles != null)
                        {
                            foreach (var file in idFiles)
                            {
                                if (string.IsNullOrWhiteSpace(file.url)) continue;

                                connect.tenant_document.Add(new tenant_document
                                {
                                    Tid = newTenant.Tid,
                                    fileName = file.name,
                                    fileUrl = file.url,
                                    fileType = "ID Document"
                                });
                            }
                            connect.SaveChanges();
                        }

                        return Json(new { success = true, message = "Tenant Saved Successfully" },
                                    JsonRequestBehavior.AllowGet);
                    }

                    // ========================================================
                    // UPDATE
                    // ========================================================
                    int previousUnitId = existingTenant.unitId;

                    existingTenant.name = tenantData.name;
                    existingTenant.email = tenantData.email;
                    existingTenant.phone = tenantData.phone;
                    existingTenant.address = tenantData.address;
                    existingTenant.occupation = tenantData.occupation;
                    existingTenant.occupancyTypeId = tenantData.occupancyTypeId;
                    existingTenant.unitId = tenantData.unitId;
                    existingTenant.leaseStart = tenantData.leaseStart;
                    existingTenant.leaseEnd = tenantData.leaseEnd;

                    // Blank means "leave the password alone"
                    if (!string.IsNullOrEmpty(tenantData.passwordHash))
                        existingTenant.passwordHash = tenantData.passwordHash;

                    connect.SaveChanges();

                    // ---- Co-occupant deletions (sent inside tenantData) ----
                    if (tenantData.deletedCoOccupants != null && tenantData.deletedCoOccupants.Any())
                    {
                        var toDelete = connect.co_occupant
                            .Where(c => tenantData.deletedCoOccupants.Contains(c.id))
                            .ToList();

                        connect.co_occupant.RemoveRange(toDelete);
                        connect.SaveChanges();
                    }

                    // ---- Co-occupant adds and edits ----
                    if (tenantData.occupancyTypeId == 2 && coOccupants != null)
                    {
                        foreach (var occ in coOccupants)
                        {
                            if (occ.id == 0)
                            {
                                // New row
                                connect.co_occupant.Add(new co_occupant
                                {
                                    Tid = existingTenant.Tid,
                                    name = occ.name,
                                    phone = occ.phone,
                                    address = occ.address
                                });
                            }
                            else
                            {
                                var existingOcc = connect.co_occupant.FirstOrDefault(c => c.id == occ.id);
                                if (existingOcc != null)
                                {
                                    existingOcc.name = occ.name;
                                    existingOcc.phone = occ.phone;
                                    existingOcc.address = occ.address;
                                }
                            }
                        }
                        connect.SaveChanges();
                    }
                    else if (tenantData.occupancyTypeId == 1)
                    {
                        // Switched back to Solo — clear them all out
                        var all = connect.co_occupant
                            .Where(c => c.Tid == existingTenant.Tid)
                            .ToList();

                        if (all.Any())
                        {
                            connect.co_occupant.RemoveRange(all);
                            connect.SaveChanges();
                        }
                    }

                    // ---- Document deletions ----
                    if (deletedDocumentIds != null && deletedDocumentIds.Any())
                    {
                        var docsToDelete = connect.tenant_document
                            .Where(d => deletedDocumentIds.Contains(d.id))
                            .ToList();

                        connect.tenant_document.RemoveRange(docsToDelete);
                        connect.SaveChanges();
                    }

                    // ---- New documents only (existing ones already have an id) ----
                    if (idFiles != null)
                    {
                        foreach (var file in idFiles)
                        {
                            if (file.id != 0) continue;
                            if (string.IsNullOrWhiteSpace(file.url)) continue;

                            connect.tenant_document.Add(new tenant_document
                            {
                                Tid = existingTenant.Tid,
                                fileName = file.name,
                                fileUrl = file.url,
                                fileType = "ID Document"
                            });
                        }
                        connect.SaveChanges();
                    }

                    // ---- Unit reassignment: free the old one ----
                    if (previousUnitId != existingTenant.unitId && previousUnitId > 0)
                    {
                        bool stillOccupied = connect.tenant
                            .Any(t => t.unitId == previousUnitId
                                      && t.Tid != existingTenant.Tid
                                      && t.isTerminated != 1);

                        if (!stillOccupied)
                        {
                            var oldUnit = connect.unit.FirstOrDefault(u => u.Uid == previousUnitId);
                            if (oldUnit != null)
                            {
                                oldUnit.status = "active";   // vacant but still listed
                                connect.SaveChanges();
                            }
                        }
                    }

                    return Json(new { success = true, message = "Tenant Saved Successfully" },
                                JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) },
                            JsonRequestBehavior.AllowGet);
            }
        }
        [HttpPost]
        public JsonResult SaveUnit(unit data, List<string> imageUrls, string amenityIds, int? id)
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    // ---- Parse "1,3,5" into a list of ints ----
                    var parsedAmenityIds = new List<int>();
                    if (!string.IsNullOrEmpty(amenityIds))
                    {
                        parsedAmenityIds = amenityIds.Split(',')
                                                     .Where(x => !string.IsNullOrWhiteSpace(x))
                                                     .Select(int.Parse)
                                                     .ToList();
                    }

                    // ---- Cap images ----
                    var images = (imageUrls ?? new List<string>())
                        .Where(u => !string.IsNullOrWhiteSpace(u))
                        .Take(10)
                        .ToList();

                    var existingUnit = connect.unit.FirstOrDefault(x => x.Uid == id);
                    int unitId;

                    if (existingUnit == null)
                    {
                        // ================= INSERT =================
                        var unitData = new unit
                        {
                            unitName = data.unitName,
                            price = data.price,
                            beds = data.beds,
                            sqm = data.sqm,
                            floor = data.floor,
                            description = data.description,
                            videoUrl = data.videoUrl,
                            colorCode = data.colorCode,
                            status = data.status,
                            address = data.address,
                            maxOccupants = data.maxOccupants
                        };

                        connect.unit.Add(unitData);
                        connect.SaveChanges();

                        unitId = unitData.Uid;
                    }
                    else
                    {
                        // ================= UPDATE =================
                        existingUnit.unitName = data.unitName;
                        existingUnit.price = data.price;
                        existingUnit.beds = data.beds;
                        existingUnit.sqm = data.sqm;
                        existingUnit.floor = data.floor;
                        existingUnit.description = data.description;
                        existingUnit.videoUrl = data.videoUrl;
                        existingUnit.colorCode = data.colorCode;
                        existingUnit.status = data.status;
                        existingUnit.address = data.address;
                        existingUnit.maxOccupants = data.maxOccupants;

                        connect.SaveChanges();

                        unitId = existingUnit.Uid;
                    }

                    // ---- IMAGES: clear and re-insert, for both insert and update ----
                    var oldImages = connect.unit_image.Where(x => x.Uid == unitId).ToList();
                    if (oldImages.Any())
                    {
                        connect.unit_image.RemoveRange(oldImages);
                        connect.SaveChanges();
                    }

                    for (int i = 0; i < images.Count; i++)
                    {
                        connect.unit_image.Add(new unit_image
                        {
                            Uid = unitId,
                            imageUrl = images[i],
                            displayOrder = i
                        });
                    }

                    // ---- AMENITIES: same clear-and-reinsert ----
                    var oldAmenities = connect.unit_amenity.Where(x => x.Uid == unitId).ToList();
                    if (oldAmenities.Any())
                    {
                        connect.unit_amenity.RemoveRange(oldAmenities);
                        connect.SaveChanges();
                    }

                    foreach (var aId in parsedAmenityIds)
                    {
                        connect.unit_amenity.Add(new unit_amenity
                        {
                            Uid = unitId,
                            amenityId = aId
                        });
                    }

                    connect.SaveChanges();

                    return Json(new
                    {
                        success = true,
                        message = "Unit Saved Successfully",
                        imageCount = images.Count
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) },
                            JsonRequestBehavior.AllowGet);
            }
        }


        // ============================================================
        // VIDEO UPLOAD  —  new action
        // ============================================================
        // Videos go to disk, not the database. A 20MB clip becomes ~27MB of
        // base64 and would be dragged out of MySQL on every page load.
        // Returns the path, which the frontend puts into videoUrl.

        [HttpPost]
        public JsonResult UploadUnitVideo()
        {
            try
            {
                if (Request.Files.Count == 0 || Request.Files[0] == null || Request.Files[0].ContentLength == 0)
                    return Json(new { success = false, message = "No video file received." });

                var file = Request.Files[0];

                var allowed = new[] { ".mp4", ".webm", ".mov", ".m4v" };
                string ext = System.IO.Path.GetExtension(file.FileName).ToLower();

                if (!allowed.Contains(ext))
                    return Json(new { success = false, message = "Only MP4, WEBM, MOV or M4V files are allowed." });

                if (file.ContentLength > 50 * 1024 * 1024)
                    return Json(new { success = false, message = "Video must be under 50MB." });

                string folder = Server.MapPath("~/uploads/videos");
                if (!System.IO.Directory.Exists(folder))
                    System.IO.Directory.CreateDirectory(folder);

                string fileName = Guid.NewGuid().ToString() + ext;
                file.SaveAs(System.IO.Path.Combine(folder, fileName));

                return Json(new
                {
                    success = true,
                    url = "/uploads/videos/" + fileName,
                    name = file.FileName
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        [HttpPost]
        public JsonResult ConfirmBooking(int id)
        {
            using (var connect = new DB_Context())
            {
                var booking = connect.booking.FirstOrDefault(b => b.id == id);
                if (booking != null)
                {
                    booking.status = "Confirmed";
                    connect.SaveChanges();

                    var unit = connect.unit.FirstOrDefault(u => u.Uid == booking.Uid);
                    var unitName = unit?.unitName ?? "the unit";

                    EmailServices.SendBookingConfirmed(
                        booking.guestEmail,
                        booking.guestName,
                        unitName,
                        booking.bookingDatetime
                    );

                    return Json(new { success = true, message = "Booking confirmed!" });
                }
                return Json(new { success = false, message = "Booking not found." });
            }
        }

        [HttpPost]
        public JsonResult DeclineBooking(int id, string reason)
        {
            using (var connect = new DB_Context())
            {
                var booking = connect.booking.FirstOrDefault(b => b.id == id);
                if (booking != null)
                {
                    booking.status = "Declined";
                    booking.cancelReason = reason;
                    connect.SaveChanges();

                    var unit = connect.unit.FirstOrDefault(u => u.Uid == booking.Uid);
                    var unitName = unit?.unitName ?? "the unit";

                    EmailServices.SendBookingDeclined(
                        booking.guestEmail,
                        booking.guestName,
                        unitName,
                        booking.bookingDatetime,
                        reason
                    );

                    return Json(new { success = true, message = "Booking declined." });
                }
                return Json(new { success = false, message = "Booking not found." });
            }
        }

        [HttpPost]
        public JsonResult ToggleBusyDate(string dateStr)
        {
            try
            {
                using (var connect = new DB_Context()) // Use your actual DbContext
                {
                    // Convert the string "2026-05-12" into a proper C# DateTime
                    if (DateTime.TryParse(dateStr, out DateTime parsedDate))
                    {
                        // Check if this exact date is already in the database
                        var existingDate = connect.busy_schedule.FirstOrDefault(b => b.busyDate == parsedDate);

                        if (existingDate != null)
                        {
                            // It exists! That means the admin clicked an already-busy day to free it up.
                            connect.busy_schedule.Remove(existingDate);
                            connect.SaveChanges();

                            return Json(new { success = true, action = "removed" });
                        }
                        else
                        {
                            // It doesn't exist! The admin wants to block this day off.
                            var newBusy = new busy_schedule
                            {
                                busyDate = parsedDate
                            };

                            connect.busy_schedule.Add(newBusy);
                            connect.SaveChanges();

                            return Json(new { success = true, action = "added" });
                        }
                    }

                    return Json(new { success = false, message = "Invalid date format." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) }, JsonRequestBehavior.AllowGet);
            }
        }
        [HttpPost]
        public JsonResult RemoveBusyDate(string dateStr)
        {
            try
            {
                using (var connect = new DB_Context()) // Use your actual DB Context
                {
                    // CASE 1: Clear EVERYTHING
                    if (dateStr == "ALL")
                    {
                        var allDates = connect.busy_schedule.ToList();
                        connect.busy_schedule.RemoveRange(allDates);
                        connect.SaveChanges();

                        return Json(new { success = true, message = "All busy dates cleared." });
                    }

                    // CASE 2: Delete just a SINGLE date
                    else if (DateTime.TryParse(dateStr, out DateTime parsedDate))
                    {
                        var targetDate = connect.busy_schedule.FirstOrDefault(b => b.busyDate == parsedDate);

                        if (targetDate != null)
                        {
                            connect.busy_schedule.Remove(targetDate);
                            connect.SaveChanges();
                        }

                        return Json(new { success = true, message = "Busy date removed." });
                    }

                    return Json(new { success = false, message = "Invalid command or date format." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Server error: " + ex.Message });
            }
        }
        [HttpPost]
        public JsonResult SaveMaintenanceRequest(maintenance_request requestData, int? id)
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    // 1. Intelligently find the correct Tenant ID based on the chosen Unit
                    var activeTenant = connect.tenant.FirstOrDefault(t =>
                        t.unitId == requestData.Uid && t.status != "inactive");

                    int tid = activeTenant != null ? activeTenant.Tid : 0;

                    // 2. CHECK IF INSERT OR UPDATE
                    if (requestData.id == 0)
                    {
                        var newRequest = new maintenance_request
                        {
                            Uid = requestData.Uid,
                            Tid = requestData.Tid, // <-- Direct assignment!
                            category = requestData.category,
                            priority = requestData.priority,
                            description = requestData.description,
                            status = "Pending",
                            reportedDate = DateTime.Now,
                        };

                        connect.maintenance_request.Add(newRequest);
                        connect.SaveChanges();

                        return Json(new { success = true, message = "Request saved successfully" }, JsonRequestBehavior.AllowGet);
                    }
                    else
                    {
                        // --- B. UPDATE EXISTING REQUEST ---
                        var existingRequest = connect.maintenance_request.FirstOrDefault(m => m.id == requestData.id);

                        if (existingRequest != null)
                        {

                            existingRequest.status = requestData.status;


                            connect.SaveChanges();

                            return Json(new { success = true, newId = existingRequest.id, message = "Request saved successfully" }, JsonRequestBehavior.AllowGet);
                        }
                        else
                        {
                            return Json(new { success = false, message = "Request not found" }, JsonRequestBehavior.AllowGet);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) }, JsonRequestBehavior.AllowGet);
            }
        }
        [HttpPost]
        public JsonResult MarkPaymentsPaid(int Tid, int Uid, decimal amount, List<MonthItem> months)
        {
            try
            {
                using (var db = new DB_Context())
                {
                    foreach (var m in months)
                    {
                        // Match by Tid, Uid, and dueDate month/year
                        var existing = db.payment.FirstOrDefault(p =>
                            p.Tid == Tid &&
                            p.Uid == Uid &&
                            p.dueDate.Month == m.Month &&
                            p.dueDate.Year == m.Year &&
                            p.paidDate == null
                        );

                        if (existing != null)
                        {
                            // UPDATE — record exists but unpaid
                            existing.paidDate = DateTime.Now;
                        }
                        else
                        {
                            // Check if already paid (skip) or truly missing (insert)
                            bool alreadyPaid = db.payment.Any(p =>
                                p.Tid == Tid &&
                                p.Uid == Uid &&
                                p.dueDate.Month == m.Month &&
                                p.dueDate.Year == m.Year &&
                                p.paidDate != null
                            );

                            if (!alreadyPaid)
                            {
                                // INSERT — no record at all for this month
                                db.payment.Add(new payment
                                {
                                    Tid = Tid,
                                    Uid = Uid,
                                    amount = amount,
                                    dueDate = new DateTime(m.Year, m.Month, 1),
                                    paidDate = DateTime.Now,
                                    billingPeriod = new DateTime(m.Year, m.Month, 1).ToString("MMMM yyyy")
                                });
                            }
                        }
                    }

                    db.SaveChanges();
                    return Json(new { success = true, message = "Payments marked as paid." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) });
            }
        }
        // Get API
        public JsonResult GetDashboardData()
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    var currentDate = DateTime.Now.Date;

                    // 1. Existing Top-Level Metrics
                    var requests = connect.maintenance_request
                         .Where(m => m.status == "Pending")
                         .Select(m => m.status).ToList();

                    var units = connect.unit
                        .Where(m => m.status == "active")
                        .Select(m => m.status).ToList();

                    var bookings = connect.booking
                        .Where(m => m.status == "Pending")
                        .Select(m => m.status).ToList();

                    var payments = connect.payment
                        .Where(m => m.paidDate != null)
                        .Sum(m => (decimal?)m.amount) ?? 0;

                    // 2. Recent Bookings List
                    var raw = (from b in connect.booking
                               join u in connect.unit on b.Uid equals u.Uid
                               orderby b.bookingDatetime descending
                               select new
                               {
                                   id = b.id,
                                   name = b.guestName,
                                   unitName = u.unitName,
                                   bookingDate = b.bookingDatetime,
                                   status = b.status
                               }).Take(5).ToList();

                    var recentBookings = raw.Select(b => new
                    {
                        id = b.id,
                        name = b.name,
                        unitName = b.unitName,
                        bookingDate = b.bookingDate.ToString("yyyy-MM-dd HH:mm:ss"),
                        status = b.status
                    }).ToList();

                    // 3. Monthly Revenue Logic
                    var monthlyRevenue = connect.payment
                         .Where(x => x.paidDate != null)
                         .Select(x => new
                         {
                             Year = x.paidDate.Value.Year,
                             Month = x.paidDate.Value.Month,
                             x.amount
                         })
                         .GroupBy(x => new { x.Year, x.Month })
                         .Select(p => new
                         {
                             Year = p.Key.Year,
                             Month = p.Key.Month,
                             Revenue = p.Sum(x => x.amount)
                         })
                         .OrderBy(x => x.Year)
                         .ThenBy(x => x.Month)
                         .ToList();

                    // I-load ang mga tables para sa occupancy computation
                    var allUnits = connect.unit.ToList();
                    var allTenants = connect.tenant.ToList();

                    // --------------------------------------------------------
                    // BAGONG LOGIC: CURRENT VACANT UNITS (Pang-Dashboard Card)
                    // --------------------------------------------------------
                    int totalActiveUnitsCount = allUnits.Count(u => u.status == "active");

                    var occupiedUnitIdsToday = allTenants
                    .Where(t =>
                        t.leaseStart.Date <= currentDate &&
                        t.leaseEnd.Date >= currentDate &&
                        t.isTerminated == 0 &&            // 2. Sinigurado na hindi terminated ang tenant
                        t.status.ToLower() == "active"    // 3. (Optional) Sinigurado na active ang status
                    )
                    .Select(t => t.unitId)
                    .Distinct()
                    .ToList();

                    int currentVacantUnits = Math.Max(0, totalActiveUnitsCount - occupiedUnitIdsToday.Count);


                    // --------------------------------------------------------
                    // BAGONG LOGIC: MONTHLY OCCUPIED VS VACANT UNITS (Pang-Chart)
                    // --------------------------------------------------------
                    var monthlyOccupant = allTenants
                        .Select(t => new
                        {
                            Year = t.leaseStart.Year,
                            Month = t.leaseStart.Month
                        })
                        .Distinct()
                        .OrderBy(x => x.Year)
                        .ThenBy(x => x.Month)
                        .Select(period =>
                        {
                            // Kunin lahat ng tenants na active sa buwang ito
                            var tenantThisMonth = allTenants
                                .Where(t =>
                                    (t.leaseStart.Year < period.Year ||
                                        (t.leaseStart.Year == period.Year && t.leaseStart.Month <= period.Month)) &&
                                    (t.leaseEnd.Year > period.Year ||
                                        (t.leaseEnd.Year == period.Year && t.leaseEnd.Month >= period.Month))
                                ).ToList();

                            // Bilangin kung ilang DISTINCT units ang occupied this month
                            int occupiedUnitsCount = tenantThisMonth
                                .Select(t => t.unitId)
                                .Distinct()
                                .Count();

                            // I-subtract sa total active units para makuha ang vacant units
                            int vacantUnitsCount = Math.Max(0, totalActiveUnitsCount - occupiedUnitsCount);

                            return new
                            {
                                Year = period.Year,
                                Month = period.Month,
                                OccupiedUnits = occupiedUnitsCount,
                                VacantUnits = vacantUnitsCount
                            };
                        })
                        .ToList();

                    // I-return ang lahat sa frontend
                    return Json(new
                    {
                        success = true,
                        activeUnitNum = units,
                        pendingRequestNum = requests,
                        pendingBookNum = bookings,
                        totalPayment = payments,
                        recentBookings = recentBookings,
                        monthlyRevenue = monthlyRevenue,
                        monthlyOccupant = monthlyOccupant,
                        currentVacantUnits = currentVacantUnits, // Idinagdag dito
                        message = "Get Data Success"
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) }, JsonRequestBehavior.AllowGet);
            }
        }
        [HttpGet]
        public JsonResult GetAllAmenities()
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    var amenities = connect.amenity
                        .Select(a => new
                        {
                            id = a.id,
                            name = a.name
                        })
                        .ToList();

                    return Json(new { success = true, data = amenities }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public ActionResult GetAllUnit()
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    var today = DateTime.Today;
                    var expiringThresHold = today.AddDays(45);

                    var units = connect.unit.ToList();
                    var tenants = connect.tenant.ToList();
                    var amenities = connect.amenity.ToList();
                    var unitAmenities = connect.unit_amenity.ToList();

                    // Cover image only. Pulling every image for every unit is what
                    // blew past the serializer limit — the grid shows one thumbnail,
                    // and the editor fetches the full set via GetUnitImages.
                    var coverImages = connect.unit_image
                        .GroupBy(i => i.Uid)
                        .Select(g => g.OrderBy(i => i.displayOrder).FirstOrDefault())
                        .ToList();

                    var result = units.Select(u =>
                    {
                        var tenant = tenants.FirstOrDefault(t =>
                            t.unitId == u.Uid &&
                            t.status != "inactive"
                        );

                        string occupancy;
                        if (tenant == null)
                        {
                            occupancy = "Vacant";
                        }
                        else if (tenant.leaseEnd <= expiringThresHold)
                        {
                            occupancy = "Expiring";
                        }
                        else
                        {
                            occupancy = "Occupied";
                        }

                        var unitAmenityList = unitAmenities
                            .Where(ua => ua.Uid == u.Uid)
                            .Join(amenities,
                                ua => ua.amenityId,
                                a => a.id,
                                (ua, a) => new
                                {
                                    a.id,
                                    a.name
                                })
                            .ToList();

                        var cover = coverImages.FirstOrDefault(i => i != null && i.Uid == u.Uid);

                        return new
                        {
                            u.Uid,
                            u.unitName,
                            u.price,
                            u.beds,
                            u.sqm,
                            u.floor,
                            u.description,
                            u.videoUrl,
                            u.colorCode,
                            u.status,
                            u.address,
                            u.maxOccupants,
                            occupancy,

                            // Same shape as before: [{ imageUrl: "..." }], just capped at one
                            images = cover == null
                                ? new List<object>()
                                : new List<object> { new { cover.imageUrl } },

                            // How many there really are, for the grid badge
                            imageCount = coverImages.Count(i => i != null && i.Uid == u.Uid) == 0
                                ? 0
                                : connect.unit_image.Count(i => i.Uid == u.Uid),

                            amenities = unitAmenityList
                        };
                    }).ToList();

                    return LargeJson(new { success = true, data = result });
                }
            }
            catch (Exception ex)
            {
                return LargeJson(new { success = false, message = ErrorHandling(ex) });
            }
        }
        [HttpGet]
        public ActionResult GetUnitImages(int uid)
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    var images = connect.unit_image
                        .Where(i => i.Uid == uid)
                        .OrderBy(i => i.displayOrder)
                        .Select(i => i.imageUrl)
                        .ToList();

                    return LargeJson(new { success = true, data = images });
                }
            }
            catch (Exception ex)
            {
                return LargeJson(new { success = false, message = ex.Message });
            }
        }
        public JsonResult GetAllTenant()
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    var today = DateTime.Today;
                    var expiringThreshold = today.AddDays(45);

                    var tenants = connect.tenant.ToList();
                    var units = connect.unit.ToList();
                    var coOccupants = connect.co_occupant.ToList();
                    var tenantDocuments = connect.tenant_document.ToList();

                    // 1. The RAW query (Runs in SQL Server)
                    var raw = (from t in tenants
                                   // Left join the unit to get the unit name safely
                               join u in units on t.unitId equals u.Uid into unitGroup
                               from u in unitGroup.DefaultIfEmpty()
                               select new
                               {
                                   t.Tid,
                                   t.tenantNumber,
                                   t.name,
                                   t.email,
                                   t.phone,
                                   t.address,
                                   t.occupation,
                                   t.status,
                                   t.leaseStart,
                                   t.leaseEnd,
                                   t.isTerminated,
                                   t.unitId,
                                   t.occupancyTypeId,
                                   t.passwordHash,
                                   unitName = u != null ? u.unitName : null,
                                   maxOccupants = u != null ? u.maxOccupants : 0,
                                   coOccupantsList = coOccupants.Where(c => c.Tid == t.Tid).Select(c => new
                                   {
                                       c.id,
                                       c.Tid,
                                       c.name,
                                       c.phone,
                                       c.address
                                   }).ToList(),
                                   additionalOccupantsCount = coOccupants.Count(c => c.Tid == t.Tid),


                                   idFiles = tenantDocuments
                                    .Where(d => d.Tid == t.Tid)
                                    .Select(d => new
                                    {
                                        id = d.id,
                                        url = d.fileUrl,
                                        fileName = d.fileName,
                                        fileType = d.fileType
                                    })
                                    .ToList(),

                               }).ToList();

                    var data = raw.Select(t =>
                    {
                        // Occupancy logic
                        var occupancyType = t.additionalOccupantsCount > 0 ? "with_others" : "solo";

                        // Days left logic
                        var daysLeft = (int?)(t.leaseEnd.Date - today).TotalDays;

                        // Live status logic
                        string liveStatus;
                        if (t.isTerminated == 1)
                            liveStatus = "Terminated";
                        else if (t.leaseEnd < today)
                            liveStatus = "Expired";
                        else if (t.leaseEnd <= expiringThreshold)
                            liveStatus = "Expiring";
                        else
                            liveStatus = "Active";

                        // Contract type logic
                        var leaseDurationMonths = ((t.leaseEnd.Year - t.leaseStart.Year) * 12) + t.leaseEnd.Month - t.leaseStart.Month;
                        string contractType;
                        if (leaseDurationMonths <= 3)
                            contractType = "Short-term";
                        else if (leaseDurationMonths <= 6)
                            contractType = "Mid-term";
                        else
                            contractType = "Long-term";

                        return new
                        {
                            Tid = t.Tid,
                            tenantNumber = t.tenantNumber,
                            name = t.name,
                            email = t.email,
                            phone = t.phone,
                            address = t.address,
                            occupation = t.occupation,
                            status = t.status,
                            coOccupants = t.coOccupantsList,
                            maxOccupants = t.maxOccupants,

                            leaseStart = t.leaseStart.ToString("yyyy-MM-dd"),
                            leaseEnd = t.leaseEnd.ToString("yyyy-MM-dd"),

                            isTerminated = t.isTerminated == 1,
                            unit = t.unitName,
                            unitId = t.unitId,
                            passwordHash = t.passwordHash,
                            occupancyType = occupancyType,
                            occupancyTypeId = t.occupancyTypeId,
                            additionalOccupantsCount = t.additionalOccupantsCount,
                            daysLeft = daysLeft,
                            liveStatus = liveStatus,
                            contractType = contractType,
                            latestPaymentStatus = "None",

                            idFiles = t.idFiles
                        };
                    }).ToList();

                    return Json(new { success = true, data = data }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) }, JsonRequestBehavior.AllowGet);
            }
        }
        public JsonResult GetAllBooking()
        {
            try
            {
                using (var connect = new DB_Context()) // Use your actual DbContext name
                {
                    // 1. Fetch Bookings and join with Units to get the UnitName
                    var raw = (from b in connect.booking
                               join u in connect.unit on b.Uid equals u.Uid into unitJoin
                               from u in unitJoin.DefaultIfEmpty()
                               select new
                               {
                                   id = b.id,
                                   name = b.guestName,
                                   email = b.guestEmail,
                                   phone = b.guestPhone,
                                   datetime = b.bookingDatetime,
                                   status = b.status,
                                   unitName = u != null ? u.unitName : "Unknown Unit"
                               })
                                        .OrderByDescending(b => b.datetime)
                                        .ToList();
                    var bookingsData = raw.Select(x => new
                    {
                        id = x.id,
                        name = x.name,
                        email = x.email,
                        phone = x.phone,

                        // CHANGE THIS LINE: Add the 'T'
                        datetime = x.datetime.ToString("yyyy-MM-ddTHH:mm:ss"),

                        status = x.status,
                        unitName = x.unitName
                    });
                    // 2. Fetch Busy Dates
                    // NOTE: If you have a busy_schedule table, query it here. 
                    // If not, we just pass an empty list for now to prevent frontend errors.
                    var busyDatesList = connect.busy_schedule
                        .ToList() // This executes the query to grab them from SQL
                        .Select(b => b.busyDate.ToString("yyyy-MM-dd")) // Formats them for the calendar
                        .ToList();

                    return Json(new
                    {
                        success = true,
                        bookings = bookingsData,
                        busyDates = busyDatesList // Now contains your real database dates!
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) }, JsonRequestBehavior.AllowGet);
            }
        }
        public JsonResult GetAllMaintenance()
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    // 1. Fetch all tables into memory (matching your GetAllUnit pattern)
                    var maintenanceRequests = connect.maintenance_request.ToList();
                    var units = connect.unit.ToList();
                    var tenants = connect.tenant.ToList();

                    // 2. Map the maintenance requests
                    var requestsResult = maintenanceRequests.Select(m =>
                    {
                        // Find related unit and tenant
                        var unit = units.FirstOrDefault(u => u.Uid == m.Uid);
                        var tenant = tenants.FirstOrDefault(t => t.Tid == m.Tid);

                        return new
                        {
                            id = m.id,
                            category = m.category,
                            status = m.status,
                            description = m.description,

                            // Fallbacks in case the unit or tenant was deleted
                            unitName = unit != null ? unit.unitName : "Unknown Unit",
                            tenantName = tenant != null ? tenant.name : "Unknown Tenant",

                            reportedDate = m.reportedDate.ToString("MMM dd, yyyy hh:mm tt"),

                            resolvedDate = m.resolvedDate.HasValue ? m.resolvedDate.Value.ToString("MMM dd, yyyy hh:mm tt") : null,
                            // UI placeholders for fields that aren't in your DB model yet
                   
                            scheduledDate = (string)null,
                            scheduledTime = (string)null
                        };
                    }).ToList();

                    // 3. Map the units for the "Add Request" dropdown
                    var unitsResult = units.Select(u => new
                    {
                        u.Uid,
                        u.unitName
                    }).ToList();

                    var tenantsResult = tenants.Select(t => new
                    {
                        Tid = t.Tid,
                        name = t.name
                    }).ToList();

                    return Json(new
                    {
                        success = true,
                        requests = requestsResult,
                        units = unitsResult,
                        tenants = tenantsResult // <-- Send this to Angular!
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) }, JsonRequestBehavior.AllowGet);
            }
        }
        [HttpGet]
        public JsonResult GetAllPayment()
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    // 1. Fetch tables into memory
                    // We pull these to memory to handle the computed 'status' property logic safely
                    var paymentsList = connect.payment.ToList();
                    var tenantsList = connect.tenant.ToList();
                    var unitsList = connect.unit.ToList();

                    // 2. Filter to show ONLY the latest bill per tenant
                    var latestPayments = paymentsList
                        .GroupBy(p => p.Tid) // Group all bills belonging to the same tenant
                        .Select(group => group
                            .OrderByDescending(p => p.dueDate) // Sort by newest date first
                            .FirstOrDefault() // Pick only the top one (the most recent)
                        )
                        .ToList();

                    // 3. Map the data for the frontend
                    var result = latestPayments.Select(p =>
                    {
                        // Find related tenant
                        var tenant = tenantsList.FirstOrDefault(t => t.Tid == p.Tid);

                        // Find unit (using payment Uid or tenant's current unitId)
                        var unitIdToFind = p.Uid > 0 ? p.Uid : (tenant != null ? tenant.unitId : 0);
                        var unit = unitsList.FirstOrDefault(u => u.Uid == unitIdToFind);

                        return new
                        {
                            id = p.id,
                            Tid = p.Tid,
                            Uid = p.Uid,

                            // Human readable names
                            tenantName = tenant != null ? tenant.name : "Unknown Tenant",
                            unitName = unit != null ? unit.unitName : "Unknown Unit",

                            month = p.billingPeriod,
                            amount = p.amount,
                            status = p.status, // C# property handles the "Unpaid/Paid/Overdue" logic

                            // Format dates
                            dueDate = p.dueDate.ToString("MMM dd, yyyy"),
                            paidDate = p.paidDate.HasValue ? p.paidDate.Value.ToString("MMM dd, yyyy") : null
                        };
                    }).ToList();

                    return Json(new { success = true, data = result }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                // Using your ErrorHandling helper
                return Json(new { success = false, message = ErrorHandling(ex) }, JsonRequestBehavior.AllowGet);
            }
        }


        //Delete
        public JsonResult DeleteUnit(unit data)
        {
            System.Diagnostics.Debug.WriteLine("Data is " + data.Uid);
            try
            {
                using (var connect = new DB_Context())
                {
                    var deleteUnit = connect.unit.Where(u => u.Uid == data.Uid).FirstOrDefault();
                    var deleteUnitImage = connect.unit_image.Where(u => u.Uid == deleteUnit.Uid).ToList();
                    connect.unit.Remove(deleteUnit);
                    connect.unit_image.RemoveRange(deleteUnitImage);
                    connect.SaveChanges();
                }
                return Json(new { success = true, message = "Unit Successfully Deleted" });

            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) });
            }
        }
        public JsonResult DeleteTenant(tenant data)
        {
            System.Diagnostics.Debug.WriteLine("Data is " + data.Tid);
            try
            {
                using (var connect = new DB_Context())
                {
                    var deleteTenant = connect.tenant.Where(u => u.Tid == data.Tid).FirstOrDefault();
                    var deleteTenantDocu = connect.tenant_document.Where(u => u.Tid == deleteTenant.Tid).ToList();
                    connect.tenant.Remove(deleteTenant);
                    connect.tenant_document.RemoveRange(deleteTenantDocu);
                    connect.SaveChanges();
                }
                return Json(new { success = true, message = "Tenant Successfully Deleted" });

            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ErrorHandling(ex) });
            }
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

        // ============================================================


        private ContentResult LargeJson(object data)
        {
            var serializer = new System.Web.Script.Serialization.JavaScriptSerializer();
            serializer.MaxJsonLength = int.MaxValue;

            return new ContentResult
            {
                Content = serializer.Serialize(data),
                ContentType = "application/json",
                ContentEncoding = System.Text.Encoding.UTF8
            };
        }

        public ActionResult GetBrowseUnits()
        {
            try
            {
                using (var connect = new DB_Context())
                {
                    var today = DateTime.Today;

                    // ---- 1. Units that currently have a live tenant ----
                    var occupiedUnitIds = connect.tenant
                        .Where(t => t.isTerminated != 1 && t.leaseEnd >= today)
                        .Select(t => t.unitId)
                        .Distinct()
                        .ToList();

                    // ---- 2. Vacant, active units ----
                    var units = connect.unit
                        .Where(u => u.status == "active" && !occupiedUnitIds.Contains(u.Uid))
                        .OrderBy(u => u.unitName)
                        .ToList();

                    var unitIds = units.Select(u => u.Uid).ToList();

                    // ---- 3. Images and amenities ----
                    var images = connect.unit_image
                        .Where(i => unitIds.Contains(i.Uid))
                        .OrderBy(i => i.displayOrder)
                        .Select(i => new { i.Uid, i.imageUrl })
                        .ToList();

                    var amenities = (from ua in connect.unit_amenity
                                     join a in connect.amenity on ua.amenityId equals a.id
                                     where unitIds.Contains(ua.Uid)
                                     select new { ua.Uid, a.name })
                                    .ToList();

                    // ---- 4. Project ----
                    var data = units.Select(u => new
                    {
                        id = u.Uid,
                        name = u.unitName,
                        price = u.price,
                        beds = u.beds,
                        sqm = u.sqm,
                        floor = u.floor,
                        description = u.description ?? "",
                        address = u.address ?? "",
                        videoUrl = u.videoUrl,
                        colorCode = u.colorCode,
                        status = u.status,
                        maxOccupants = u.maxOccupants,

                        // Cover image only — the grid never shows the rest
                        images = images
                            .Where(i => i.Uid == u.Uid)
                            .Select(i => i.imageUrl)
                            .Take(1)
                            .ToList(),

                        amenities = amenities
                            .Where(a => a.Uid == u.Uid)
                            .Select(a => a.name)
                            .ToList()
                    }).ToList();

                    // ---- 5. Filter options ----
                    var bedOptions = units
                        .Where(u => !string.IsNullOrEmpty(u.beds))
                        .Select(u => u.beds)
                        .Distinct()
                        .OrderBy(b => b)
                        .ToList();

                    var amenityOptions = connect.amenity
                        .OrderBy(a => a.name)
                        .Select(a => a.name)
                        .ToList();

                    return LargeJson(new
                    {
                        success = true,
                        data = data,
                        bedOptions = bedOptions,
                        amenityOptions = amenityOptions
                    });
                }
            }
            catch (Exception ex)
            {
                return LargeJson(new { success = false, message = ex.Message });
            }
        }


        // ============================================================
        // Paste both actions into SystemController
        // ============================================================

        // Stores the clicked unit in Session so the detail URL stays clean.
        [HttpPost]
        public JsonResult SetSelectedUnit(int id)
        {
            Session["SelectedUid"] = id;
            return Json(new { success = true });
        }


        // Reads the unit chosen by SetSelectedUnit and returns everything the
        // detail page needs: the unit, its occupancy, and similar units.

        [HttpGet]
        public ActionResult GetUnitDetail()
        {
            try
            {
                int selectedUid;
                var raw = Session["SelectedUid"];

                if (raw == null || !int.TryParse(raw.ToString(), out selectedUid))
                    return LargeJson(new { success = false, message = "No unit selected." });

                using (var connect = new DB_Context())
                {
                    var today = DateTime.Today;

                    var u = connect.unit.FirstOrDefault(x => x.Uid == selectedUid);
                    if (u == null)
                        return LargeJson(new { success = false, message = "Unit not found." });

                    // ---- Occupancy ----
                    // Vacant   : no live tenant
                    // Expiring : live tenant whose lease ends within 45 days
                    // Occupied : live tenant
                    var tenant = connect.tenant
                        .Where(t => t.unitId == u.Uid && t.isTerminated != 1 && t.leaseEnd >= today)
                        .OrderByDescending(t => t.leaseEnd)
                        .FirstOrDefault();

                    string occupancy = "Vacant";
                    if (tenant != null)
                    {
                        var daysLeft = (tenant.leaseEnd - today).TotalDays;
                        occupancy = (daysLeft <= 45) ? "Expiring" : "Occupied";
                    }

                    // ---- Images and amenities ----
                    var images = connect.unit_image
                        .Where(i => i.Uid == u.Uid)
                        .OrderBy(i => i.displayOrder)
                        .Select(i => i.imageUrl)
                        .ToList();

                    var amenities = (from ua in connect.unit_amenity
                                     join a in connect.amenity on ua.amenityId equals a.id
                                     where ua.Uid == u.Uid
                                     select a.name)
                                    .ToList();

                    var unit = new
                    {
                        id = u.Uid,
                        name = u.unitName,
                        price = u.price,
                        beds = u.beds,
                        sqm = u.sqm,
                        floor = u.floor,
                        description = u.description ?? "",
                        address = u.address ?? "",
                        video = u.videoUrl,
                        color = u.colorCode,
                        maxOccupants = u.maxOccupants,
                        images = images,
                        amenities = amenities
                    };

                    // ---- Similar units: same type, active, still vacant ----
                    var occupiedUnitIds = connect.tenant
                        .Where(t => t.isTerminated != 1 && t.leaseEnd >= today)
                        .Select(t => t.unitId)
                        .Distinct()
                        .ToList();

                    var related = connect.unit
                        .Where(x => x.Uid != u.Uid
                                    && x.status == "active"
                                    && x.beds == u.beds
                                    && !occupiedUnitIds.Contains(x.Uid))
                        .OrderBy(x => x.unitName)
                        .Take(3)
                        .ToList();

                    var relatedIds = related.Select(x => x.Uid).ToList();

                    var relatedImages = connect.unit_image
                        .Where(i => relatedIds.Contains(i.Uid))
                        .OrderBy(i => i.displayOrder)
                        .Select(i => new { i.Uid, i.imageUrl })
                        .ToList();

                    var relatedUnits = related.Select(x => new
                    {
                        id = x.Uid,
                        name = x.unitName,
                        price = x.price,
                        sqm = x.sqm,
                        floor = x.floor,
                        color = x.colorCode,
                        image = relatedImages
                            .Where(i => i.Uid == x.Uid)
                            .Select(i => i.imageUrl)
                            .FirstOrDefault()
                    }).ToList();

                    return LargeJson(new
                    {
                        success = true,
                        unit = unit,
                        occupancy = occupancy,
                        relatedUnits = relatedUnits
                    });
                }
            }
            catch (Exception ex)
            {
                return LargeJson(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public JsonResult GetMyBookings()
        {
            try
            {
                bool verified = Session["VisitorVerified"] != null && (bool)Session["VisitorVerified"];
                if (!verified)
                    return Json(new { success = true, verified = false, data = new List<object>() },
                                JsonRequestBehavior.AllowGet);

                string email = Session["VisitorEmail"] as string;

                using (var connect = new DB_Context())
                {
                    var rows = (from b in connect.booking
                                join u in connect.unit on b.Uid equals u.Uid
                                where b.guestEmail == email
                                select new { b, u.unitName })
                               .ToList();

                    var data = rows
                        .OrderByDescending(x => x.b.bookingDatetime)
                        .Select(x => new
                        {
                            id = x.b.id,
                            unitId = x.b.Uid,
                            unitName = x.unitName,
                            name = x.b.guestName,
                            email = x.b.guestEmail,
                            phone = x.b.guestPhone,
                            date = x.b.bookingDatetime.ToString("MMM dd, yyyy"),
                            time = x.b.bookingDatetime.ToString("h:mm tt"),
                            status = x.b.status,
                            notes = x.b.notes,
                            cancelReason = x.b.cancelReason
                        })
                        .ToList();

                    return Json(new
                    {
                        success = true,
                        verified = true,
                        name = Session["VisitorName"],
                        email = email,
                        data = data
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message },
                            JsonRequestBehavior.AllowGet);
            }
        }


        [HttpPost]
        public JsonResult CancelMyBooking(int id, string reason)
        {
            try
            {
                bool verified = Session["VisitorVerified"] != null && (bool)Session["VisitorVerified"];
                if (!verified)
                    return Json(new { success = false, message = "Please sign in first." });

                if (string.IsNullOrWhiteSpace(reason))
                    return Json(new { success = false, message = "Please select or enter a reason for cancellation." });

                string email = Session["VisitorEmail"] as string;

                using (var connect = new DB_Context())
                {
                    // Match on the session email too, so nobody can cancel
                    // someone else's booking by guessing an id.
                    var booking = connect.booking
                        .FirstOrDefault(b => b.id == id && b.guestEmail == email);

                    if (booking == null)
                        return Json(new { success = false, message = "Booking not found." });

                    if (booking.status != "Pending" && booking.status != "Confirmed")
                        return Json(new { success = false, message = "This booking can no longer be cancelled." });

                    booking.status = "Cancelled";
                    booking.cancelReason = reason.Trim();
                    connect.SaveChanges();

                    return Json(new { success = true, message = "Booking cancelled successfully." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        ////// SMS
        ///
        [HttpPost]
        public JsonResult RunSmsNotifications(bool dryRun = true)
        {
            try
            {
                var run = NotificationScanner.Run(dryRun);

                return Json(new
                {
                    success = true,
                    dryRun = dryRun,
                    scanned = new
                    {
                        expiringLeases = run.expiringLeases,
                        duePayments = run.duePayments
                    },
                    results = run.results
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        [HttpGet]
        public JsonResult SchedulerStatus()
        {
            return Json(new
            {
                success = true,
                lastRunAt = SmsScheduler.LastRunAt.HasValue
                            ? SmsScheduler.LastRunAt.Value.ToString("MMM dd, yyyy h:mm:ss tt")
                            : "never",
                lastRunSummary = SmsScheduler.LastRunSummary ?? "-"
            }, JsonRequestBehavior.AllowGet);
        }

        //private const int SMS_COOLDOWN_DAYS = 7;
        //private const int LEASE_WARN_DAYS = 45;
        //private const int PAYMENT_WARN_DAYS = 15;

        //public JsonResult RunSmsNotifications(bool dryRun = true)
        //{
        //    try
        //    {
        //        using (var connect = new DB_Context())
        //        {
        //            var today = DateTime.Today;
        //            var leaseCutoff = today.AddDays(LEASE_WARN_DAYS);
        //            var paymentCutoff = today.AddDays(PAYMENT_WARN_DAYS);
        //            var cooldownSince = DateTime.Now.AddDays(-SMS_COOLDOWN_DAYS);

        //            var results = new List<object>();

        //            // Recently notified, so we can skip duplicates
        //            var recent = connect.sms_log
        //            .Where(s => s.sentAt >= cooldownSince)
        //            .Select(s => new { s.Tid, s.type })
        //            .ToList();

        //            // ------------------------------------------------------------
        //            // 1. LEASES EXPIRING WITHIN 45 DAYS
        //            // ------------------------------------------------------------
        //            var expiring = connect.tenant
        //                .Where(t => t.isTerminated != 1
        //                            && t.leaseEnd >= today
        //                            && t.leaseEnd <= leaseCutoff)
        //                .ToList();

        //            foreach (var t in expiring)
        //            {
        //                if (recent.Any(r => r.Tid == t.Tid && r.type == "Lease Expiry"))
        //                {
        //                    results.Add(Skipped(t.name, "Lease Expiry", "Already notified recently"));
        //                    continue;
        //                }

        //                int daysLeft = (int)(t.leaseEnd - today).TotalDays;

        //                string message =
        //                    $"Hi {t.name}, your lease at Green Residences ends on " +
        //                    $"{t.leaseEnd:MMM dd, yyyy} ({daysLeft} day{(daysLeft == 1 ? "" : "s")} left). " +
        //                    "Please contact the office to renew. Thank you!";

        //                results.Add(Dispatch(connect, t.Tid, t.name, t.phone, "Lease Expiry", message, dryRun));
        //            }

        //            // ------------------------------------------------------------
        //            // 2. PAYMENTS DUE WITHIN 15 DAYS (still unpaid)
        //            // ------------------------------------------------------------
        //            var dueSoon = (from p in connect.payment
        //                           join t in connect.tenant on p.Tid equals t.Tid
        //                           where p.paidDate == null
        //                                 && p.dueDate >= today
        //                                 && p.dueDate <= paymentCutoff
        //                                 && t.isTerminated != 1
        //                           select new { p, t })
        //                          .ToList();

        //            foreach (var row in dueSoon)
        //            {
        //                if (recent.Any(r => r.Tid == row.t.Tid && r.type == "Payment Due"))
        //                {
        //                    results.Add(Skipped(row.t.name, "Payment Due", "Already notified recently"));
        //                    continue;
        //                }

        //                int daysLeft = (int)(row.p.dueDate - today).TotalDays;

        //                string message =
        //                    $"Hi {row.t.name}, your rent of PHP {row.p.amount:N2} for " +
        //                    $"{row.p.billingPeriod} is due on {row.p.dueDate:MMM dd, yyyy} " +
        //                    $"({daysLeft} day{(daysLeft == 1 ? "" : "s")} left). " +
        //                    "Please settle on or before the due date. Thank you!";

        //                results.Add(Dispatch(connect, row.t.Tid, row.t.name, row.t.phone, "Payment Due", message, dryRun));
        //            }

        //            connect.SaveChanges();

        //            return Json(new
        //            {
        //                success = true,
        //                dryRun = dryRun,
        //                scanned = new
        //                {
        //                    expiringLeases = expiring.Count,
        //                    duePayments = dueSoon.Count
        //                },
        //                results = results
        //            });
        //        }
        //    }
        //    catch (Exception ex)
        //    {
        //        return Json(new { success = false, message = ex.Message });
        //    }
        //}


        //// Builds the log row and, when not a dry run, actually sends.
        //private object Dispatch(DB_Context connect, int tid, string name, string rawPhone,
        //                        string type, string message, bool dryRun)
        //{
        //    string phone = SmsServices.NormalizePhone(rawPhone);

        //    if (phone == null)
        //    {
        //        var badLog = new sms_log
        //        {
        //            Tid = tid,
        //            message = message,
        //            type = type,
        //            status = "Invalid Number",
        //            sentAt = DateTime.Now
        //        };
        //        connect.sms_log.Add(badLog);

        //        return new
        //        {
        //            tenant = name,
        //            phone = rawPhone,
        //            type = type,
        //            status = "Invalid Number",
        //            message = message
        //        };
        //    }

        //    string status;
        //    string error = null;

        //    if (dryRun)
        //    {
        //        status = "Preview";
        //    }
        //    else
        //    {
        //        error = SmsServices.SendSms(phone, message);
        //        status = (error == null) ? "Sent" : "Failed";
        //    }

        //    var log = new sms_log
        //    {
        //        Tid = tid,
        //        message = message,
        //        type = type,
        //        status = status,
        //        sentAt = DateTime.Now
        //    };
        //    connect.sms_log.Add(log);

        //    return new
        //    {
        //        tenant = name,
        //        phone = phone,
        //        type = type,
        //        status = status,
        //        error = error,
        //        message = message
        //    };
        //}


        //private object Skipped(string name, string type, string why)
        //{
        //    return new
        //    {
        //        tenant = name,
        //        phone = (string)null,
        //        type = type,
        //        status = "Skipped",
        //        error = why,
        //        message = (string)null
        //    };
        //}


        //// ============================================================
        //// LOG VIEWER
        //// ============================================================
        //[HttpGet]
        //public JsonResult GetSmsLogs()
        //{
        //    try
        //    {
        //        using (var connect = new DB_Context())
        //        {
        //            var logs = (from s in connect.sms_log
        //                        join t in connect.tenant on s.Tid equals t.Tid into g
        //                        from t in g.DefaultIfEmpty()
        //                        select new { s, tenantName = t != null ? t.name : "(unknown)" })
        //                       .ToList()
        //                       .OrderByDescending(x => x.s.sentAt)
        //                       .Take(100)
        //                       .Select(x => new
        //                       {
        //                           id = x.s.id,
        //                           tenantName = x.tenantName,
        //                           type = x.s.type,
        //                           status = x.s.status,
        //                           message = x.s.message,
        //                           sentAt = x.s.sentAt.ToString("MMM dd, yyyy h:mm tt")
        //                       })
        //                       .ToList();

        //            return Json(new { success = true, data = logs }, JsonRequestBehavior.AllowGet);
        //        }
        //    }
        //    catch (Exception ex)
        //    {
        //        return Json(new { success = false, message = ex.Message },
        //                    JsonRequestBehavior.AllowGet);
        //    }
        //}
    }
}

    