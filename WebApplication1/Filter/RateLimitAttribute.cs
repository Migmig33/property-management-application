using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace WebApplication1.Filter
{
    public class RateLimitAttribute : ActionFilterAttribute
    {
        // Defaukt 5 request every 10 sec
        public int sec { get; set; } = 10;
        public int requests { get; set; } = 5;

        public override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            var req = filterContext.HttpContext.Request;

            var ip = req.UserHostAddress;

            var actionName = filterContext.ActionDescriptor.ActionName;
            var key = $"RateLimit_{ip}_{actionName}";

            var cache = HttpRuntime.Cache;
            var hitCount = (int?)(cache[key]) ?? 0;

            if(hitCount >= requests)
            {
                filterContext.Result = new JsonResult
                {
                    Data = new { success = false, message = "Too Many Request, Please wait a moment before trying again.." },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
                filterContext.HttpContext.Response.StatusCode = 429;
                return;
            }

            var newCount = hitCount + 1;
            cache.Insert(
                key,
                newCount,
                null,
                DateTime.Now.AddSeconds(sec),
                System.Web.Caching.Cache.NoSlidingExpiration
                );
            base.OnActionExecuting(filterContext);
        }
    }
}