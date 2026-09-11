using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Drawing;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
using WebApplication1.Controllers;
using WebApplication1.Models.Tables;

public static class TenantIdUploadChecks
{
    public static void Run(string folder)
    {
        byte[] bytes;
        using (var bitmap = new Bitmap(1024, 1024))
        using (var stream = new MemoryStream())
        {
            bitmap.Save(stream, ImageFormat.Bmp);
            bytes = stream.ToArray();
        }
        Check(bytes.Length > 2 * 1024 * 1024, "Fixture exceeds the old request and database limits");
        var upload = new TestUpload(bytes, "id.bmp");
        var context = new TestContext(folder, upload);
        var controller = new SystemController();
        controller.ControllerContext = new ControllerContext(context, new RouteData(), controller);
        controller.Url = new UrlHelper(controller.ControllerContext.RequestContext);

        var values = new ValueProviderCollection
        {
            new NameValueCollectionValueProvider(new NameValueCollection
            {
                { "tenantData.name", "Test Tenant" },
                { "tenantData.unitId", "3" },
                { "tenantData.leaseStart", "2026-09-07" },
                { "tenantData.deletedCoOccupants[0]", "12" },
                { "coOccupants[0].name", "Occupant" },
                { "coOccupants[0].phone", "123" },
                { "deletedDocumentIds[0]", "44" }
            }, CultureInfo.InvariantCulture),
            new HttpFileCollectionValueProvider(controller.ControllerContext)
        };
        var tenant = Bind<tenant>(controller, values, "tenantData");
        Check(tenant.name == "Test Tenant" && tenant.unitId == 3 && tenant.deletedCoOccupants.Single() == 12,
            "MVC binds tenant form fields and nested deletion IDs");
        Check(Bind<List<co_occupant>>(controller, values, "coOccupants").Single().name == "Occupant",
            "MVC binds co-occupants");
        Check(Bind<List<int>>(controller, values, "deletedDocumentIds").Single() == 44,
            "MVC binds document deletions");
        Check(Bind<List<HttpPostedFileBase>>(controller, values, "idUploads").Count == 2,
            "MVC binds both files under the repeated idUploads key");

        var paths = new List<string>();
        var save = typeof(SystemController).GetMethod("SaveTenantIdImage", BindingFlags.Instance | BindingFlags.NonPublic);
        try
        {
            string url = (string)save.Invoke(controller, new object[] { upload, paths });
            Check(url.StartsWith("/System/TenantIdImage?name=") && url.Length < 100,
                "A large image produces a small document URL");
            Check(File.ReadAllBytes(paths.Single()).SequenceEqual(bytes), "Image bytes survive storage unchanged");
            string name = Path.GetFileName(paths.Single());
            Check(controller.TenantIdImage(name) is FilePathResult, "Saved image can be retrieved");
            Check(controller.TenantIdImage("../outside.bmp") is HttpNotFoundResult, "Path traversal is rejected");
            Check(controller.TenantIdImage("missing.bmp") is HttpNotFoundResult, "Missing image returns 404");
            foreach (var invalid in new[] {
                new TestUpload(new byte[] { 1, 2, 3 }, "fake.jpg"),
                new TestUpload(new byte[10 * 1024 * 1024 + 1], "oversized.jpg") })
            {
                try
                {
                    save.Invoke(controller, new object[] { invalid, paths });
                    throw new Exception("Invalid upload was accepted");
                }
                catch (TargetInvocationException ex)
                {
                    Check(ex.InnerException is InvalidOperationException, "Invalid/oversized image is rejected");
                }
            }
            Check(paths.Count == 1, "Rejected uploads do not create files");
        }
        finally
        {
            foreach (var file in paths) File.Delete(file);
        }
    }

    private static T Bind<T>(Controller controller, IValueProvider values, string name)
    {
        var binding = new ModelBindingContext
        {
            ModelMetadata = ModelMetadataProviders.Current.GetMetadataForType(null, typeof(T)),
            ModelName = name, ValueProvider = values
        };
        var result = (T)new DefaultModelBinder().BindModel(controller.ControllerContext, binding);
        Check(binding.ModelState.IsValid, "Valid model state for " + name);
        return result;
    }
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
        Console.WriteLine("PASS: " + message);
    }
    private sealed class TestUpload : HttpPostedFileBase
    {
        private readonly byte[] bytes;
        private readonly string name;
        public TestUpload(byte[] bytes, string name) { this.bytes = bytes; this.name = name; }
        public override int ContentLength { get { return bytes.Length; } }
        public override string FileName { get { return name; } }
        public override Stream InputStream { get { return new MemoryStream(bytes); } }
        public override void SaveAs(string path) { File.WriteAllBytes(path, bytes); }
    }
    private sealed class TestFiles : HttpFileCollectionBase
    {
        private readonly HttpPostedFileBase file;
        public TestFiles(HttpPostedFileBase file) { this.file = file; }
        public override int Count { get { return 2; } }
        public override string[] AllKeys { get { return new[] { "idUploads", "idUploads" }; } }
        public override HttpPostedFileBase this[int index] { get { return file; } }
    }
    private sealed class TestRequest : HttpRequestBase
    {
        private readonly HttpFileCollectionBase files;
        public TestRequest(HttpPostedFileBase file) { files = new TestFiles(file); }
        public override HttpFileCollectionBase Files { get { return files; } }
        public override string ApplicationPath { get { return "/"; } }
        public override NameValueCollection ServerVariables { get { return new NameValueCollection(); } }
        public override string RawUrl { get { return "/System/SaveTenant"; } }
        public override string Path { get { return "/System/SaveTenant"; } }
    }
    private sealed class TestServer : HttpServerUtilityBase
    {
        private readonly string folder;
        public TestServer(string folder) { this.folder = folder; }
        public override string MapPath(string path)
        {
            return Path.Combine(folder, path.Substring("~/App_Data/TenantIds".Length).TrimStart('/'));
        }
    }
    private sealed class TestResponse : HttpResponseBase
    {
        public override string ApplyAppPathModifier(string path) { return path; }
        public override HttpCachePolicyBase Cache { get { return new TestCache(); } }
    }
    private sealed class TestCache : HttpCachePolicyBase
    {
        public override void SetCacheability(HttpCacheability value) { }
        public override void SetNoStore() { }
    }
    private sealed class TestContext : HttpContextBase
    {
        private readonly string folder;
        private readonly HttpPostedFileBase file;
        public TestContext(string folder, HttpPostedFileBase file) { this.folder = folder; this.file = file; }
        public override HttpServerUtilityBase Server { get { return new TestServer(folder); } }
        public override HttpRequestBase Request { get { return new TestRequest(file); } }
        public override HttpResponseBase Response { get { return new TestResponse(); } }
        public override object GetService(Type type) { return null; }
        public override System.Collections.IDictionary Items { get { return new System.Collections.Hashtable(); } }
    }
}
