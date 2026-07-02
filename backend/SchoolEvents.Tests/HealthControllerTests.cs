using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Controllers;
using SchoolEvents.Data;
using Xunit;

namespace SchoolEvents.Tests;

public class HealthControllerTests
{
    private SchoolEventsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SchoolEventsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SchoolEventsDbContext(options);
    }

    [Fact]
    public void Health_ShouldReturnOk()
    {
        var db = GetInMemoryDbContext();
        var controller = new HealthController(db);

        var result = controller.Health();

        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = JsonSerializer.Serialize(okResult.Value);
        using var doc = JsonDocument.Parse(json);
        Assert.Equal("ok", doc.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Ready_ShouldReturnServiceUnavailable_WhenDatabaseFails()
    {
        var controller = new HealthController(null!);

        var result = await controller.Ready();

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, objectResult.StatusCode);

        var json = JsonSerializer.Serialize(objectResult.Value);
        using var doc = JsonDocument.Parse(json);
        Assert.Equal("not_ready", doc.RootElement.GetProperty("status").GetString());
    }
}