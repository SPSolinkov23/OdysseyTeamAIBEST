using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Controllers;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using Xunit;

namespace SchoolEvents.Tests;

public class AdminControllerTests
{
    private SchoolEventsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SchoolEventsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        return new SchoolEventsDbContext(options);
    }

    private AdminController CreateController(SchoolEventsDbContext db, long loggedInUserId)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new Claim(ClaimTypes.NameIdentifier, loggedInUserId.ToString()) 
        }, "mock"));

        var controller = new AdminController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            }
        };

        return controller;
    }

    [Fact]
    public async Task PendingOrganizers_ShouldReturnOnlyPendingUsers()
    {
        var db = GetInMemoryDbContext();
        
        db.Users.Add(new User { Id = 1, Email = "admin@school.edu", Role = UserRole.Student });
        db.Add(new Admin { UserId = 1, CreatedAt = DateTime.UtcNow });
        
        db.Users.Add(new User { Id = 2, OrganizerStatus = OrganizerStatus.Pending, Email = "pending@test.com" });
        db.Users.Add(new User { Id = 3, OrganizerStatus = OrganizerStatus.Approved, Email = "approved@test.com" });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);

        var result = await controller.PendingOrganizers();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<PendingOrganizersResponse>(okResult.Value);
        
        Assert.Single(response.PendingOrganizers);
        Assert.Equal(2, response.PendingOrganizers.First().Id);
    }

    [Fact]
    public async Task Approve_ShouldUpdateUserAndCreateNotifications()
    {
        var db = GetInMemoryDbContext();
        
        db.Users.Add(new User { Id = 1, Email = "admin@school.edu", Role = UserRole.Student });
        db.Add(new Admin { UserId = 1, CreatedAt = DateTime.UtcNow });
        
        db.Users.Add(new User { Id = 2, OrganizerStatus = OrganizerStatus.Pending, Email = "test@test.com" });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);

        var result = await controller.Approve(2);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var decision = Assert.IsType<OrganizerDecisionResult>(okResult.Value);
        
        Assert.Equal(2, decision.Id);
        Assert.Equal(OrganizerStatus.Approved, decision.OrganizerStatus);

        var updatedUser = await db.Users.FindAsync(2L);
        Assert.Equal(OrganizerStatus.Approved, updatedUser!.OrganizerStatus);
        Assert.Equal(UserRole.Organizer, updatedUser.Role);

        var job = await db.NotificationJobs.SingleOrDefaultAsync();
        Assert.NotNull(job);
        Assert.Equal("OrganizerApproved", job!.Type); 
    }

    [Fact]
    public async Task Reject_ShouldUpdateStatusButNotRole()
    {
        var db = GetInMemoryDbContext();
        
        db.Users.Add(new User { Id = 1, Email = "admin@school.edu", Role = UserRole.Student });
        db.Add(new Admin { UserId = 1, CreatedAt = DateTime.UtcNow });
        
        db.Users.Add(new User { Id = 2, OrganizerStatus = OrganizerStatus.Pending });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);

        await controller.Reject(2);

        var updatedUser = await db.Users.FindAsync(2L);
        Assert.Equal(OrganizerStatus.Rejected, updatedUser!.OrganizerStatus);
        Assert.NotEqual(UserRole.Organizer, updatedUser.Role); 
        
        var job = await db.NotificationJobs.SingleOrDefaultAsync();
        Assert.NotNull(job);
        Assert.Equal("OrganizerRejected", job!.Type); 
    }

    [Fact]
    public async Task LoadPendingAsync_ShouldThrowNotFound_IfUserDoesNotExist()
    {
        var db = GetInMemoryDbContext();
        
        db.Users.Add(new User { Id = 1, Email = "admin@school.edu", Role = UserRole.Student });
        db.Add(new Admin { UserId = 1, CreatedAt = DateTime.UtcNow });
        
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);

        await Assert.ThrowsAsync<ApiException>(() => controller.Approve(99));
    }

    [Fact]
    public async Task LoadPendingAsync_ShouldThrowBadRequest_IfUserIsNotPending()
    {
        var db = GetInMemoryDbContext();
        
        db.Users.Add(new User { Id = 1, Email = "admin@school.edu", Role = UserRole.Student });
        db.Add(new Admin { UserId = 1, CreatedAt = DateTime.UtcNow });
        
        db.Users.Add(new User { Id = 2, OrganizerStatus = OrganizerStatus.Approved });
        await db.SaveChangesAsync();

        var controller = CreateController(db, 1);

        await Assert.ThrowsAsync<ApiException>(() => controller.Approve(2));
    }
}