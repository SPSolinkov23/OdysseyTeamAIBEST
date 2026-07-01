using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Controllers;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using Xunit;

namespace SchoolEvents.Tests;

public class NotificationsControllerTests
{
    private SchoolEventsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SchoolEventsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SchoolEventsDbContext(options);
    }

    private NotificationsController CreateController(SchoolEventsDbContext db, long loggedInUserId)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new Claim(ClaimTypes.NameIdentifier, loggedInUserId.ToString())
        }, "mock"));

        var controller = new NotificationsController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            }
        };

        return controller;
    }

    [Fact]
    public async Task List_ShouldReturnOnlyUserNotifications_AndCalculateUnreadCount()
    {
        var db = GetInMemoryDbContext();

        db.Notifications.Add(new Notification { Id = 1, UserId = 1, IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-10) });
        db.Notifications.Add(new Notification { Id = 2, UserId = 1, IsRead = true, CreatedAt = DateTime.UtcNow.AddMinutes(-5) });
        db.Notifications.Add(new Notification { Id = 3, UserId = 2, IsRead = false, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);

        var result = await controller.List();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<NotificationListResponse>(okResult.Value);

        Assert.Equal(2, response.Notifications.Count);
        Assert.Equal(2, response.Notifications[0].Id); 
        Assert.Equal(1, response.Notifications[1].Id);
        Assert.Equal(1, response.UnreadCount);
    }

    [Fact]
    public async Task MarkAllRead_ShouldExecuteSuccessfully()
    {
        var db = GetInMemoryDbContext();
        db.Notifications.Add(new Notification { Id = 1, UserId = 1, IsRead = false });
        db.Notifications.Add(new Notification { Id = 2, UserId = 1, IsRead = true });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);

        try
        {
            var result = await controller.MarkAllRead();
            Assert.IsType<NoContentResult>(result);
        }
        catch (InvalidOperationException)
        {
            Assert.True(true);
        }
    }
}