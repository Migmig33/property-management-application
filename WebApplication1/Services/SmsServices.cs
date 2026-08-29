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

        private const string PHILSMS_ENDPOINT = "https://dashboard.philsms.com/api/v3/sms/send";

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

        public static string SendSms(string toPhone, string message)
        {
            try
            {
                string token = ConfigurationManager.AppSettings["PhilSmsToken"];
                if (string.IsNullOrWhiteSpace(token))
                    return "PhilSmsToken is not set in Web.config.";

                string senderId = ConfigurationManager.AppSettings["PhilSmsSenderId"];
                if (string.IsNullOrWhiteSpace(senderId))
                    return "PhilSmsSenderId is not set in Web.config.";

                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

                var request = (HttpWebRequest)WebRequest.Create(PHILSMS_ENDPOINT);
                request.Method = "POST";
                request.ContentType = "application/json";
                request.Accept = "application/json";
                request.Headers["Authorization"] = "Bearer " + token;

                string body = "{" +
                    "\"recipient\":\"" + Escape(toPhone) + "\"," +
                    "\"sender_id\":\"" + Escape(senderId) + "\"," +
                    "\"type\":\"plain\"," +
                    "\"message\":\"" + Escape(message) + "\"}";

                byte[] payload = Encoding.UTF8.GetBytes(body);
                request.ContentLength = payload.Length;

                using (var stream = request.GetRequestStream())
                {
                    stream.Write(payload, 0, payload.Length);
                }

                string raw;
                using (var response = (HttpWebResponse)request.GetResponse())
                using (var reader = new StreamReader(response.GetResponseStream()))
                {
                    raw = reader.ReadToEnd();
                }

                // PhilSMS can return HTTP 200 with {"status":"error", ...},
                // so the body has to be checked, not just the status code.
                return ReadStatus(raw);
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
        private static string ReadStatus(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return "Empty response from PhilSMS.";

            try
            {
                dynamic parsed = Newtonsoft.Json.JsonConvert.DeserializeObject(raw);

                string status = (string)parsed.status;

                if (string.Equals(status, "success", StringComparison.OrdinalIgnoreCase))
                    return null;

                string msg = (string)parsed.message;
                return string.IsNullOrWhiteSpace(msg) ? raw : msg;
            }
            catch
            {
                // Unparseable body — hand the whole thing back
                return raw;
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