using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Controllers;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using Xunit;

namespace SchoolEvents.Tests;

public class NotificationJobsControllerTests
{
    private SchoolEventsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SchoolEventsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SchoolEventsDbContext(options);
    }

    [Fact]
    public async Task List_ShouldReturnAllJobs_WhenNoFiltersProvided()
    {
        var db = GetInMemoryDbContext();
        db.NotificationJobs.Add(new NotificationJob { Id = 1, Type = "Email", Status = JobStatus.Pending });
        db.NotificationJobs.Add(new NotificationJob { Id = 2, Type = "Push", Status = JobStatus.Pending });
        await db.SaveChangesAsync();

        var controller = new NotificationJobsController(db);

        var result = await controller.List(null, null);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<JobListResponse>(okResult.Value);
        
        Assert.Equal(2, response.Jobs.Count);
    }

    [Fact]
    public async Task List_ShouldFilterByEventId_WhenEventIdProvided()
    {
        var db = GetInMemoryDbContext();
        db.NotificationJobs.Add(new NotificationJob { Id = 1, Type = "Email", EventId = 10, Status = JobStatus.Pending });
        db.NotificationJobs.Add(new NotificationJob { Id = 2, Type = "Push", EventId = 20, Status = JobStatus.Pending });
        await db.SaveChangesAsync();

        var controller = new NotificationJobsController(db);

        var result = await controller.List(10, null);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<JobListResponse>(okResult.Value);
        
        Assert.Single(response.Jobs);
        Assert.Equal(10, response.Jobs.First().EventId);
    }

    [Fact]
    public async Task List_ShouldFilterByStatus_WhenStatusProvided()
    {
        var db = GetInMemoryDbContext();
        db.NotificationJobs.Add(new NotificationJob { Id = 1, Type = "Email", Status = JobStatus.Pending });
        db.NotificationJobs.Add(new NotificationJob { Id = 2, Type = "Push", Status = (JobStatus)99 }); 
        await db.SaveChangesAsync();

        var controller = new NotificationJobsController(db);

        var result = await controller.List(null, "Pending");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<JobListResponse>(okResult.Value);
        
        Assert.Single(response.Jobs);
        Assert.Equal(JobStatus.Pending, response.Jobs.First().Status);
    }

    [Fact]
    public async Task List_ShouldApplyLimitAndOrderDescending()
    {
        var db = GetInMemoryDbContext();
        db.NotificationJobs.Add(new NotificationJob { Id = 1, Type = "Email", Status = JobStatus.Pending });
        db.NotificationJobs.Add(new NotificationJob { Id = 2, Type = "Push", Status = JobStatus.Pending });
        db.NotificationJobs.Add(new NotificationJob { Id = 3, Type = "SMS", Status = JobStatus.Pending });
        await db.SaveChangesAsync();

        var controller = new NotificationJobsController(db);

        var result = await controller.List(null, null, limit: 2);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<JobListResponse>(okResult.Value);
        
        Assert.Equal(2, response.Jobs.Count);
        Assert.Equal(3, response.Jobs[0].Id);
        Assert.Equal(2, response.Jobs[1].Id);
    }
}