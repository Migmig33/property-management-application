using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace WebApplication1.Filter
{
    public class CheckSessionAttribute :  ActionFilterAttribute
    {
        public int[] AllowedRoles { get; set; } 
        public override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            var session = filterContext.HttpContext.Session;
            if (session["IsAuthenticated"] == null || !(bool)session["IsAuthenticated"])
            {
                filterContext.Result = new RedirectToRouteResult(
                        new RouteValueDictionary(new { controller = "System", action = "Auth" })
                    );
                base.OnActionExecuting(filterContext);
                return;
            }
            if(AllowedRoles != null && AllowedRoles.Length > 0)
            {
                int roles = Convert.ToInt32(session["UserRole"]);

                if (!AllowedRoles.Contains(roles))
                {
                    filterContext.Result = new RedirectToRouteResult(
                        new RouteValueDictionary(new { controller = "System", action = "Auth" })
                        );
                    return;
                   
                }
            }
            base.OnActionExecuting(filterContext);

        }
    }
}