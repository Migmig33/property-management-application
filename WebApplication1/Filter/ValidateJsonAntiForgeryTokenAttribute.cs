using System.Web.Helpers;
using System.Web.Mvc;

namespace WebApplication1.Filter
{
    /// <summary>
    /// Validates the anti-forgery cookie against the token sent by Angular in
    /// the RequestVerificationToken header. MVC's built-in attribute only
    /// reads form fields, while these endpoints accept JSON request bodies.
    /// </summary>
    public sealed class ValidateJsonAntiForgeryTokenAttribute : FilterAttribute, IAuthorizationFilter
    {
        public void OnAuthorization(AuthorizationContext filterContext)
        {
            var request = filterContext.HttpContext.Request;
            var cookie = request.Cookies[AntiForgeryConfig.CookieName];
            var token = request.Headers["RequestVerificationToken"];

            AntiForgery.Validate(cookie == null ? null : cookie.Value, token);
        }
    }
}
