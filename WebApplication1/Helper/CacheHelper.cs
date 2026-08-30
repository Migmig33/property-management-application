using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Runtime.Caching;
namespace WebApplication1.Helper
{
    public static class CacheHelper
    {
        private static readonly MemoryCache _cache = MemoryCache.Default;

        public static T GetOrAdd<T>(string key, int minutes, Func<T> load)
        {
            if (_cache.Contains(key))
            
                return (T)_cache.Get(key);

                T data = load();
                _cache.Set(key, data, DateTimeOffset.Now.AddMinutes(minutes));
            return data;


        }
        public static void Remove(string key) => _cache.Remove(key);

    }
}