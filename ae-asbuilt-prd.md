# ArcGIS Enterprise AsBuilt Diagram Generator  

**Overview**  
ArcGIS Enterprise is a platform that comprises various components installed across a series of machines and linked together to form a system. This project is a way to extract information from any ArcGIS Enterprise deployment and automatically convert that into a diagram using a variety of diagramming tools.  

Below is information about ArcGIS Enterprise deployments along with product requirements and goals for this project.  

--- 

## ArcGIS Enterprise Components  
ArcGIS Enterprise comprises a collection of components working together. The following sections describe the components and the possible deployment options.  

### Portal for ArcGIS  
Portal for ArcGIS is the core central component of ArcGIS Enterprise. It acts as a content management system and provides identify management and a sharing/permissions structure.  
There is only ever one instance of Portal for ArcGIS in an ArcGIS Enterprise deployment, although it can be deployed with a second failover instance in a High Availability pattern.  
ArcGIS Server sites are federated with Portal for ArcGIS which creates a relationship.  

### ArcGIS Server  
ArcGIS Enterprise should include at least one ArcGIS Server site, and can include multiple sites. A "site" comprises of one of more ArcGIS Server installations, where each installation will be on a different server machine.  
ArcGIS Server sites are federated to Portal for ArcGIS, so that Portal can index and manage the services located on those sites. A federated server site can be assigned one or more *roles* by Portal to enable functionality.  
At least one server site should be designated as the **Hosting Server**. This server must meet certain requirements, such as a connection to an ArcGIS Relational Data Store and ArcGIS Object Store.  
An ArcGIS Server site has a configuration store folder as well as various server directories. On single machine sites this is often also on the local machine, but for multi-machine sites these would be on a remote network location accessible to all the machines.  

### ArcGIS Data Store  
ArcGIS Data Stores are data storage locations that are fully managed by ArcGIS Enterprise. This is conceptually different to user managed data stores which are defined by and managed by the users. There are several different types of ArcGIS Data Stores.  
- Relational: This is a Postgres database data store that holds vector data.  
- Object Store: This is either traditional file or blob storage backed data store, that can store 3D caches, cached feature query data, scene caches and video blob and other associated video service metadata files.  
- Spatiotemporal: This is designed to injest and store extremely large datasets in a database. It will either be deployed on one or three nodes.  
- Graph: This is a graph database, otherwise known as Knowledge graphs.  
- Tile cahe: This is a legacy Data Store type that is deprecated at ArcGIS Enterprise v11.5 and removed from v12.x onwards. It has been replaced by the Object Store.  

There will only be one Relational Data Store per ArcGIS Enterprise deployment, although there can be a fail-over instance.  
These ArcGIS Data Stores are all connected to an ArcGIS Server site. They should be connected to the ArcGIS Server site that is designated as the Hosting Server.  

### ArcGIS Web Adaptors  
An ArcGIS Web Adaptor is an optional component that acts as a reverse proxy for Portal for ArcGIS and ArcGIS Server sites. Some deployments do not use web adaptors, but there might be third party reverse proxies used or Web Application Firewalls (WAF) might be used.  
A web adaptor is known by it's *context* which is the name used during installation that results in the URL sub path the web adaptor is accessed by. Typical context names are ```/portal``` for Portal for ArcGIS, ```/server``` for an ArcGIS Server site, or other names like ```/image``` or ```/map```. The actual names are arbitrary, but usually reflect the intended use of the target.  

## Deployment Patterns  
ArcGIS Enterprise can be deployed on Windows, Linux or Kubenetes. This project **only** focuses on Windows deployments.  

Multiple ArcGIS components could be deployed to a given server machine. However, for components where there could be multiple installs, there could only be install on any given machine.  
For example: Portal for ArcGIS would be installed on one machine, and if there was a failover Portal then it would be installed on a seperate machine. An ArcGIS Server site might consist of multiple ArcGIS Server installs, and each install would be on a separate machine.  
The web adaptors could be installed anywhere, but typically on a dedicated web server machine located in the DMZ, and the other machines might be behind the firewall. There could be multiple web adaptors installed on one web server, each with a different context.  

## Diagrams  
The ideal diagram would follow the C4 Model. However, this project may include diagram tools that output more basic diagrams.  

“C4” stands for the four diagram levels:  

Context – Big picture: system, users, external systems.  
Container – High‑level architecture: apps, APIs, databases, services.  
Component – Internal structure of a container.  
Code – Optional: class-level detail, usually generated automatically.  

The model is intentionally simple and avoids UML complexity.  

---  


### Diagramming Tools  
Below are some of the intended target diagramming tools.   

#### Structurizr  
[Strucurizr](https://structurizr.com/)  
Structurizr builds upon "diagrams as code", allowing you to create multiple software architecture diagrams from a single model. The diagram is saved as a ```*.dsl``` text file.  

#### Mermaid  
[Mermaid](https://mermaid.js.org/)  
Mermaid diagrams are a simple diagram as code. More suited to flowcharts, but possible to use for deployment diagrams.  

#### Draw.io  
[Draw IO](https://www.drawio.com/)  
This is a visual digramming tool similar to MS Visio. Diagrams are saved as ```*.drawio``` files that can be edited.  

---  
### Output formats  
Below are some of the most common output formats that the diagramming tools might be able to export.  

- SVG: a vector file format  
- PNG: an image file format  
- JPG: an image file format  
- drawio: editable diagram format specific to Draw.io  
- visio: editable diagram format specific to MS Visio  
- html/js/css: A diagram might be incorporated into a interactive website page  
- React component: A code snippet that incorporates one of the other formats and renders it. This could be rendering or linking a static image or encapsulating an interactive diagram that can be explored.  

## Product Goals  
The aim is to create an application that will take in information from ArcGIS Enterprise about it's deployment pattern, convert it to a diagram based on a chosen diagramming tool where the raw diagram file can be saved locally and optionally also a rendering of the diagram can be generated. The diagram file might be a text file, a markdown extension code snippet, a specific text format list ```.dsl```, or a more bespoke editable file like ```*.drawio```. The render might be in the form of a static file, or an interactive web site component.  

Below is information about the expected technology stack and the product requirements.  

### Technology Stack  
The product is likely to be used alongside or incorporated into ArcGIS web applications. So it should use the latest ArcGIS Calcite design components for the UI. 
The product should use React and Node.js.  
The product is expected to be compiled as a static web application that could be hosted from S3 or a similar location.  
The product is expected to call external services, such as **Kroki** to outsource critical functionality such as rendering diagrams.  
A self-hosted version will also be developed that will be a docker image that incorporates this product (a web app) and local install of Kroki. The likely approach is to use the publicly available Kroki docker image as the base and use install scripts to pull from a GitHub repo to install this product. Potentially this could require installing other dependencies such as Draw.io locally.  
Output files will be saved locally by the user. 

### Product Requirements  
Below are product requirements. For MVP, the goal is to implement Structurizr and Mermaid diagramming as options. The solution architecture should allow to easily extend this in the future to add in further options.  

#### Upload ArcGIS Enterprise System Information   
As a user, I need to be able to feed the ArcGIS Enterprise system information into the tool.   
Expected outcome: The user will manually export the system report from their ArcGIS Enterprise as a json file. This functionality is only available from ArcGIS Enterprise 11.5 onwards. They will then be able to open up this tool in a browser, click a button and select the local json file to upload for processing.  
There is NO NEED TO connect to ArcGIS Enterprise directly to pull this information. The user will do this separately and supply the json file.  

#### Extra information about the deployment  
As a user, I want to be able to provide some extra information about this processing job. I want to be able to provide a friendly name for the deployment, e.g. ```Company X - DEV environment```, a description, my name and contact details.  
Expected outcome: After uploading the system json file, the UI should display simple information extracted from that, such as the file name and todays date, then present a form for the user to fill out with fields for Deployment Name, Description, User Name, Email, Phone. These should all be optional except for the deployment name which should be mandatory. The deployment name should only accept alphanumeric characters, and the email field should be validated as an email.    

#### Diagramming Options
As a user, I want to be able to choose the diagramming option I want. E.g. This could be Structurizr, or Mermaid, or Draw.io. And this list could be expanded in the future as the tool develops.  
Expected outcome: The user has a table presented to them of the available diagramming options. The table should have a dropdown list called Theme, and buttons for each record for Generate, Download and Render. To the left of the Render button should be a drop down list of available rendering options, e.g. output formats such as SVG, PNG, web page, or whatever other options a particular diagramming tool might provide.     

#### Themes  
As a user, I want to be able to choose from some pre-determined themes for any given diagramming option. E.g. chose colours, or perhaps a set of icons being used.  
Expected outcome: The diagramming options table should have a Themes dropdown list for each record in the table. The Themes will be hardcoded into the tool, and may be expanded in the future. For MVP there should be a couple of options for each.    

#### Generate diagram file  
As a user, once I have uploaded my system json file, then I can click the Generate button in the table corresponding to the diagramming tool that I want a diagram for, and the tool should generate the diagram files.  
Expected outcome: There should be one generate button for the user to click per diagramming option.  Once the generate button is clicked, a processing icon spins until the diagram files are ready, then the Download button becomes active and 

#### Download diagram file  
As a user, once I have generated a diagram, I want to be able to download and save that file locally.  
Expected outcome: There should be a Download button for each diagramming option in the table. They should be disabled initially. Once the processing has completed after clicking one of the Generate buttons and there is a file available, the Download button becomes active for that particular option. Clicking the Download button will save the diagram files locally.  
The generated files should download as a single zip file. Alongside the Download button in the table should be the name of the generated zip file. The file name should be a slug of the supplied deployment name up to 20 characters, with a suffix made up of a short id of the diagramming tool and the current local datetime. E.g. ```CompanyX-DEVEnvironment__DSL_202603061134.zip```. It should contain at least two files:  
- A README.md file: this will contain the supplied metadata, the diagram option used, a hardcoded description of this tool, and a comprehensive disclaimer saying use at your own risk.  
- The generated diagram file or files in the chosen format.    

#### Rendering   
As a user, once the diagram files are generated, I want to optionally be able to use the tool to render one or more of the diagrams.  
Expected outcome: Once the diagram files are generated, the Render button in the table should be activated. Note that not all diagramming options will have a rendering option available, so for those options the Render button should be say "UNAVAILABLE" and be permenantly disabled.  
The process initiated by clicking the Render button will depend on the diagramming option and configuration settings.  
If the tool can generate the diagram output internally then it can be built into the product.  
Some rendering options will require calling an external service such as Kroki.  
A render should always open in a new tab in the browser. It can be viewed and optionally saved locally from there.  

#### SAAS website  
As the developer of the product, I want to compile a static web site that I can host in AWS S3 so that others can use it directly.  
Expected outcome: A build pipeline that will generate static web site files that I can upload and host. This SAAS version will only use publicly available services such as the publicly available Kroki API. In this case, there are no configuration options.  

#### Self hosting  
As an organisation's developer or system administrator, I want to be able to run the tool locally in a Docker container.    
Expected outcome: A install script that will pull down a base Docker image and install this product into that Docker container, exposing it as a web page that can be accessed locally.  

#### Self hosting configuration options  
As an organisation's developer or system administrator, I want to be able to configure the self hosted version to control which diagramming options are available and where to find any dependencies.  
Expected outcome: A configuration json file can be manually edited.  
This could include the path to a Kroki API, which would default to the one in the Docker container but could be changed if desired.  
The configuration file should include the list of diagramming options, where each option has an **active** setting that can be set to ```true``` or ```false```.  
