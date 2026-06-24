FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
 
COPY src/SchoolEvents.Worker/SchoolEvents.Worker.csproj src/SchoolEvents.Worker/
COPY src/SchoolEvents.Data/SchoolEvents.Data.csproj src/SchoolEvents.Data/
RUN dotnet restore src/SchoolEvents.Worker/SchoolEvents.Worker.csproj
 
COPY src/ src/
WORKDIR /src/src/SchoolEvents.Worker
RUN dotnet publish -c Release -o /app
 
FROM mcr.microsoft.com/dotnet/runtime:9.0 AS runtime
WORKDIR /app
COPY --from=build /app .
 
ENTRYPOINT ["dotnet", "SchoolEvents.Worker.dll"]
