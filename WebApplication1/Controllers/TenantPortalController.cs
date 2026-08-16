using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using WebApplication1.Models.Context;
using WebApplication1.Models.Tables;

namespace WebApplication1.Controllers
{
    public class TenantPortalController : Controller
    {
            [HttpGet]
            public JsonResult GetCurrentTenantData()
            {
                // 1. Get logged-in Tenant ID (e.g., from Session)
                int currentTid = Convert.ToInt32(Session["LoggedInTid"]);


                if (currentTid == 0)
                {
                    return Json(new { success = false, message = "Not authenticated" }, JsonRequestBehavior.AllowGet);
                }

            // 2. Fetch data from DB inside a using block
            using (var connect = new DB_Context())
            {
                var tenantData = connect.tenant.FirstOrDefault(t => t.Tid == currentTid);
                if (tenantData == null)
                    return Json(new { success = false }, JsonRequestBehavior.AllowGet);

                var unitData = connect.unit.FirstOrDefault(u => u.Uid == tenantData.unitId);
                var coOccupants = connect.co_occupant.Where(c => c.Tid == currentTid).ToList();

                return Json(new
                {
                    success = true,
                    tenant = new
                    {
                        tenantData.Tid,
                        tenantData.tenantNumber,
                        tenantData.unitId,
                        tenantData.name,
                        tenantData.email,
                        tenantData.phone,
                        tenantData.status,
                        tenantData.address,
                        tenantData.occupation,
                        tenantData.occupancyTypeId,
                        tenantData.isTerminated,
                        leaseStart = tenantData.leaseStart.ToString("MMM dd, yyyy"),
                        leaseEnd = tenantData.leaseEnd.ToString("MMM dd, yyyy")
                    },
                    unitName = unitData?.unitName ?? "Unassigned",
                    coOccupants = coOccupants
                }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]

        public JsonResult GetMaintenanceRequests(int tid)
        {
            // Make sure the requested tid matches the logged-in user for security
            int currentTid = Convert.ToInt32(Session["LoggedInTid"]);
            if (tid != currentTid)
            {
                return Json(null, JsonRequestBehavior.AllowGet);
            }

            using (var connect = new DB_Context())
            {
                var requests = connect.maintenance_request
                                  .Where(m => m.Tid == tid)
                                  .OrderByDescending(m => m.reportedDate)
                                  .ToList() // 1. Execute query and pull to memory
                                  .Select(m => new
                                  {
                                      // 2. Map properties
                                      id = m.id,
                                      Tid = m.Tid,
                                      Uid = m.Uid,
                                      category = m.category,
                                      description = m.description,
                                      status = m.status,
                                      priority = m.priority,

                                      // 3. Convert Dates to standard readable strings!
                                      // "yyyy-MM-dd" gives you "2023-10-25"
                                      // Use "yyyy-MM-ddTHH:mm:ss" if you also need the exact time
                                      reportedDate = m.reportedDate.ToString("yyyy-MM-dd"),
                                      resolvedDate = m.resolvedDate.HasValue
                                                     ? m.resolvedDate.Value.ToString("yyyy-MM-dd")
                                                     : null
                                  });

                return Json(requests, JsonRequestBehavior.AllowGet);
            }
        }

            [HttpPost]
            public JsonResult SubmitMaintenanceRequest(maintenance_request req)
            {
                try
                {
                    // Validate security
                    int currentTid = Convert.ToInt32(Session["LoggedInTid"]);
                    if (req.Tid != currentTid)
                    {
                        return Json(new { success = false, message = "Unauthorized." });
                    }

                    // Force server-side dates/statuses to prevent client manipulation
                    req.reportedDate = DateTime.Now;
                    req.status = "Pending";
                    req.priority = req.priority ?? "Medium";

                    using (var connect = new DB_Context())
                    {
                        connect.maintenance_request.Add(req);
                        connect.SaveChanges();
                    }

                    return Json(new { success = true });
                }
                catch (Exception ex)
                {
                    return Json(new { success = false, message = ex.Message });
                }
            }

        public JsonResult GetPayments(int tid)
        {
            int currentTid = Convert.ToInt32(Session["LoggedInTid"]);
            if (tid != currentTid)
                return Json(null, JsonRequestBehavior.AllowGet);

            using (var connect = new DB_Context())
            {
                var payments = connect.payment
                    .Where(p => p.Tid == tid)
                    .OrderBy(p => p.dueDate)
                    .ToList()
                    .Select(p => new
                    {
                        p.id,
                        p.Tid,
                        p.Uid,
                        p.amount,
                        p.billingPeriod,
                        dueDate = p.dueDate.ToString("MMM dd, yyyy"),
                        paidDate = p.paidDate.HasValue ? p.paidDate.Value.ToString("MMM dd, yyyy") : null,
                        status = p.status,  // computed from getter
                        month = p.billingPeriod // what the frontend shows as the row title
                    })
                    .ToList();

                return Json(payments, JsonRequestBehavior.AllowGet);
            }
        }
    }
}