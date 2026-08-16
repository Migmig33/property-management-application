using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Web;

namespace WebApplication1.Services
{
    public class SmsServices
    {
        private const string UNISMS_ENDPOINT = "https://unismsapi.com/api/sms";
        public static string NormalizePhone(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;

            var digits = new string(raw.Where(char.IsDigit).ToArray());

            if (digits.StartsWith("09") && digits.Length == 11)
                return "+63" + digits.Substring(1);

            if (digits.StartsWith("639") && digits.Length == 12)
                return "+" + digits;

            if (digits.StartsWith("9") && digits.Length == 10)
                return "+63" + digits;

            return null;   // too short, junk data, or a landline
        }

        /// <summary>
        /// Sends one SMS through UniSMS.
        /// Returns null on success, or an error message on failure.
        /// </summary>
        public static string SendSms(string toPhone, string message)
        {
            try
            {
                string secretKey = ConfigurationManager.AppSettings["UniSmsApiKey"];
                if (string.IsNullOrWhiteSpace(secretKey))
                    return "UniSmsApiKey is not set in Web.config.";

                string senderId = ConfigurationManager.AppSettings["UniSmsSenderId"];
                if (string.IsNullOrWhiteSpace(senderId))
                    return "UniSmsSenderId is not set in Web.config.";

                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

                var request = (HttpWebRequest)WebRequest.Create(UNISMS_ENDPOINT);
                request.Method = "POST";
                request.ContentType = "application/json";
                request.Accept = "application/json";

                // Basic auth: secret key as the username, blank password
                string basic = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes(secretKey + ":"));
                request.Headers["Authorization"] = "Basic " + basic;

                string body = "{\"recipient\":\"" + Escape(toPhone) + "\"," +
               "\"sender_id\":\"" + Escape(senderId) + "\"," +
               "\"content\":\"" + Escape(message) + "\"}";

                byte[] payload = Encoding.UTF8.GetBytes(body);
                request.ContentLength = payload.Length;

                using (var stream = request.GetRequestStream())
                {
                    stream.Write(payload, 0, payload.Length);
                }

                using (var response = (HttpWebResponse)request.GetResponse())
                {
                    int code = (int)response.StatusCode;
                    if (code >= 200 && code < 300) return null;

                    return "UniSMS returned HTTP " + code;
                }
            }
            catch (WebException wex)
            {
                // Surface the API's own error text — much easier to debug
                // than a bare "remote server returned an error".
                try
                {
                    using (var errResponse = wex.Response)
                    using (var reader = new StreamReader(errResponse.GetResponseStream()))
                    {
                        return reader.ReadToEnd();
                    }
                }
                catch
                {
                    return wex.Message;
                }
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }

        /// <summary>Minimal JSON string escaping for the request body.</summary>
        private static string Escape(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";

            return value
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n")
                .Replace("\t", "\\t");
        }
    }
}
