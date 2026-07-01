using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Auth;
using SchoolEvents.Api.Controllers;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using Xunit;

namespace SchoolEvents.Tests;

public class UsersControllerTests
{
    private SchoolEventsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SchoolEventsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SchoolEventsDbContext(options);
    }

    private UsersController CreateController(SchoolEventsDbContext db, long loggedInUserId)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new Claim(ClaimTypes.NameIdentifier, loggedInUserId.ToString())
        }, "mock"));

        return new UsersController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            }
        };
    }

    [Fact]
    public async Task Me_ShouldReturnUserDto()
    {
        var db = GetInMemoryDbContext();
        db.Users.Add(new User { Id = 1, Email = "test@test.com", DisplayName = "Test User" });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);

        var result = await controller.Me();

        var okResult = Assert.IsType<OkObjectResult>(result);
        var userProp = okResult.Value!.GetType().GetProperty("user");
        var dto = Assert.IsType<UserDto>(userProp!.GetValue(okResult.Value));
        
        Assert.Equal(1, dto.Id);
        Assert.Equal("test@test.com", dto.Email);
    }

    [Fact]
    public async Task Update_ShouldModifyUserAndReturnDto()
    {
        var db = GetInMemoryDbContext();
        db.Users.Add(new User { Id = 1, Email = "test@test.com", DisplayName = "Old Name", Language = "en" });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);
        var req = new UpdateMeRequest { DisplayName = "New Name", Language = "bg", Theme = "dark" };

        var result = await controller.Update(req);

        var dbUser = await db.Users.FindAsync(1L);
        Assert.Equal("New Name", dbUser!.DisplayName);
        Assert.Equal("bg", dbUser.Language);
        Assert.Equal("dark", dbUser.Theme);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var userProp = okResult.Value!.GetType().GetProperty("user");
        var dto = Assert.IsType<UserDto>(userProp!.GetValue(okResult.Value));
        
        Assert.Equal("New Name", dto.DisplayName);
        Assert.Equal("bg", dto.Language);
        Assert.Equal("dark", dto.Theme);
    }

    [Fact]
    public async Task ChangePassword_ShouldUpdatePasswordHash_WhenCurrentIsCorrect()
    {
        var db = GetInMemoryDbContext();
        var oldHash = PasswordHasher.Hash("OldPassword123");
        db.Users.Add(new User { Id = 1, PasswordHash = oldHash });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);
        var req = new ChangePasswordRequest { CurrentPassword = "OldPassword123", NewPassword = "NewPassword456" };

        var result = await controller.ChangePassword(req);

        Assert.IsType<NoContentResult>(result);
        
        var dbUser = await db.Users.FindAsync(1L);
        Assert.NotEqual(oldHash, dbUser!.PasswordHash);
        Assert.True(PasswordHasher.Verify("NewPassword456", dbUser.PasswordHash));
    }

    [Fact]
    public async Task ChangePassword_ShouldThrowApiException_WhenCurrentIsIncorrect()
    {
        var db = GetInMemoryDbContext();
        var oldHash = PasswordHasher.Hash("OldPassword123");
        db.Users.Add(new User { Id = 1, PasswordHash = oldHash });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);
        var req = new ChangePasswordRequest { CurrentPassword = "WrongPassword", NewPassword = "NewPassword456" };

        await Assert.ThrowsAsync<ApiException>(() => controller.ChangePassword(req));
    }

    [Fact]
    public async Task Me_ShouldThrowApiException_WhenUserNotFound()
    {
        var db = GetInMemoryDbContext();
        var controller = CreateController(db, 99);

        await Assert.ThrowsAsync<ApiException>(() => controller.Me());
    }
}