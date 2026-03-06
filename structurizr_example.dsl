workspace "ArcGIS Enterprise Example" "ArcGIS Enterprise deployment example" {

    model {
        user = person "GIS User" {
            description "Uses web maps and GIS applications"
        }


    arcgis = softwareSystem "ArcGIS Enterprise" {
    
    portalWA = container "Portal Web Adaptor" "IIS Application" "Routes /portal traffic"
    hostingServerWA = container "Hosting Web Adaptor" "IIS Application" "Routes /hosting traffic"
    gisServerWA = container "Server Web Adaptor" "IIS Application" "Routes /server traffic"
    imageServerWA = container "Image Web Adaptor" "IIS Application" "Routes /image traffic"

    portal = container "Portal for ArcGIS" 
    hostingServer = container "Hosting" "ArcGIS Server"
    gisServer = container "GIS" "GIS Runtime" "ArcGIS Server"
    imageServer = container "Image" "ArcGIS Server"
    
    relationalDatastore = container "Relational" "Relational ArcGIS Data Store"
    objectStore = container "Object" "Object ArcGIS Data Store"

    egdb = container "SQL Server" "Enterprise Geodatabases"  "Authoritative data"
}

        // Users
        user -> portalWA "Uses applications over HTTPS"
        user -> hostingServerWA "Uses applications over HTTPS"
        user -> gisServerWA "Uses applications over HTTPS"
        user -> imageServerWA "Uses applications over HTTPS"


        // Routing
        portalWA -> portal "Routes /portal"
        hostingServerWA -> hostingServer "Routes /hosting"
        gisServerWA -> gisServer "Routes /server"
        imageServerWA -> imageServer "Routes /image"

        // Internal relationships
        portal -> hostingServer "Federates with"
        portal -> gisServer "Federates with"
        portal -> imageServer "Federates with"
        
        hostingServer -> relationalDatastore "Reads/Writes hosted data"
        hostingServer -> objectStore "Reads/Writes tile cache data"
        
        gisServer -> egdb "Reads/Writes enterprise data"

        // ✅ Deployment Environment
        production = deploymentEnvironment "Production" {

            deploymentNode "User Device" {
                infrastructureNode "Web Browser"
            }

            deploymentNode "Web Tier" {

                deploymentNode "GEOWEB01" {
                    containerInstance portalWA
                    containerInstance hostingServerWA
                    containerInstance gisServerWA
                    containerInstance imageServerWA
                }
            }

            deploymentNode "App Tier" {

                deploymentNode "GEOAPP01" {
                    containerInstance portal
                    containerInstance hostingServer
                    containerInstance relationalDatastore
                    containerInstance objectStore
                }

                deploymentNode "GEOAPP02" {
                    containerInstance gisServer
                }
                
                deploymentNode "GEOAPP03" {
                    containerInstance imageServer
                }
            }

            deploymentNode "Data Tier" {
                deploymentNode "GEODB01" {
                    containerInstance egdb
                }
            }
        }
    }

    views {

        systemContext arcgis systemContextView {
            include *
            autolayout lr
        }

        container arcgis containerView {
            include *
            autolayout lr
        }


        deployment arcgis production deploymentView {
            include *
            autolayout lr
        }

        theme default
    }
}