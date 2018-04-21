//本文件主要包含数学与几何计算处理

//获取坐标最值,参数features为geoJson的要素集,返回的是经纬度范围
function getRangeByFeatures(features) {
    var pts=[];//所有要素的geometry的点
    for(var i=0;i<features.length;i++){  //features.length对应多边形个数
        for(var j=0;j<features[i].geometry.coordinates.length;j++)
        {
            for(var k=0;k<features[i].geometry.coordinates[j].length;k++)
            {
                var pt=[features[i].geometry.coordinates[j][k][0] ,features[i].geometry.coordinates[j][k][1]];
                pts.push(pt);
            }
        }
    }
    var range={min_log:0, min_lat:0, max_log:100,max_lat:100};// log 经度  lat:纬度

    range.min_log=d3.min(pts,function (d) { return d[0];});
    range.min_lat=d3.min(pts,function (d) { return d[1];});
    range.max_log=d3.max(pts,function (d) { return d[0];});
    range.max_lat=d3.max(pts,function (d) { return d[1];});

    return range;
}

//获取坐标最值,参数coordinates为geometry里的属性，为坐标串的数组
function getRangeByCoordinates(coordinates/*,projection*/) {
    var pts=[];//
    for(var j=0;j<coordinates.length;j++)
    {
        for(var k=0;k<coordinates[j].length;k++)
        {
            var pt=[coordinates[j][k][0] ,coordinates[j][k][1]];
            pts.push(pt);
        }
    }

    var range=[];

    var topLeft=[d3.min(pts,function (d) { return d[0];}) , d3.min(pts,function (d) { return d[1];})];
    var bottomRight=[d3.max(pts,function (d) { return d[0];}) , d3.max(pts,function (d) { return d[1];})];
    if(arguments.length>1){
        topLeft=arguments[1](topLeft);
        bottomRight=arguments[1](bottomRight);
    }

    range.push(topLeft);
    range.push(bottomRight);
    return range;
}

//获取多边形重心,参数为多边形顶点集合
function getGravityCenter(pts) {
    var area=0,Gx=0,Gy=0,gravityCenter={x:0,y:0};
    for(var i=1;i<pts.length;i++)
    {
        var iX=pts[i][0],
            iY=pts[i][1],
            nextX=pts[i-1][0],
            nextY=pts[i-1][1],
            temp=(iX*nextY-iY*nextX)/2;
        area+=temp;
        Gx +=temp*(iX+nextX)/3;
        Gy +=temp*(iY+nextY)/3;
    }
    Gx=Gx/area;
    Gy=Gy/area;
    gravityCenter.x=Gx;
    gravityCenter.y=Gy;
    return gravityCenter;
}

//使用d3.json读取数据时进行重组织
function reorganize(d,projection) {
    var depth=parseInt(d.properties.depth);
    switch(depth)
    {
        case 1: //第一图层
            whole.push({  "fillColor":d.fillColor,
                "projection":projection,
                "properties":d.properties,
                "innerPolygons":[],   //记录其内部下一级各个多边形的坐标
                "subComponents":[]    //记录其内部组成（逐层嵌套）
            });
            break;
        case 2://学部  (地球科学部)
            var department={ "fillColor":d.fillColor,
                "projection":projection,
                "properties":d.properties,
                "innerPolygons":[],
                "subComponents":[]
            }
            departments.push(department);
            addSub_Inner(d,whole,department);
            break;
        case 3://学科  （地理学）
            var subject=({"fillColor":d.fillColor,
                "projection":projection,
                "properties":d.properties,
                "innerPolygons":[],
                "subComponents":[]
            });
            subjects.push(subject);
            addSub_Inner(d,departments,subject);
            break;
        case 4://子学科  （地理信息系统）
            var sub_discipline=({"fillColor": d.fillColor? d.fillColor : "#ccc",
                "projection":projection,
                "properties":d.properties,
                "innerPolygons":[],
                "subComponents":[]
            });
            sub_disciplines.push(sub_discipline);
            addSub_Inner(d,subjects,sub_discipline);
            break;
        case 5://项目  （基于深度学习的城市情感空间构建研究）
            var program=({"fillColor":  d.fillColor? d.fillColor : "#ccc",
                "projection":projection,
                "properties":d.properties,
                "geometry":d.geometry.coordinates,    // Array(7)
                "center":getGravityCenter(d.geometry.coordinates[0])//正六边形中心
            });
            programs.push(program);
            addSub_Inner(d,sub_disciplines,program);
            break;
    }
}

//读到某一图层的数据时，为其上一图层的subComponents和innerPolygons添加数据
function addSub_Inner(data, upper_layer, newItem) {
    for(var i=0; i<upper_layer.length; i++){
        if(data.properties.parentname==upper_layer[i].properties.name){
            upper_layer[i].subComponents.push(newItem);
            upper_layer[i].innerPolygons.push(data.geometry.coordinates[0]);//经纬度坐标
            break;
        }
    }
}

//数据处理后再显示
function processedShow(groups,property) {
    if(window.data_over===true){
        var data=[whole,departments,subjects,sub_disciplines,programs];
        var current_data;
        for(var i=0;i<groups.length;i++){
            if(groups[i].style("display")==="inline"){
                current_data=data[i];
                break;
            }
        }
        data=null;
        var descendings=d3.entries(current_data)
            .sort(function (a,b) {
                if(a.value.properties[property] && b.value.properties[property])
                    return d3.descending( parseInt(a.value.properties[property]),parseInt(b.value.properties[property]));
            });

        var min_sorted_array=[];
        for(var i=0;i<descendings.length;i++){
            min_sorted_array.push(descendings[i].value.properties[property]);
        }
        return min_sorted_array;
    }
}

//判断当前显示的是哪一个图层
function whichLayer(groups) {
    var layer_num=0;
    for(var i=0;i<groups.length;i++){
        if(groups[i].style("display")==="inline"){
            layer_num=i;
            break;
        }
    }
    return hierarchy[layer_num];
}

function whichGroup(groups) {
    for (var i = 0; i < groups.length; i++) {
        if (groups[i].style("display") === "inline") {
            return groups[i];
        }
    }
}

//放大某一多边形后，显示其内部细节,layer为[whole,departments,subjects,sub_disciplines,programs]之一
function displayDetail(selectedProperty,g,hit_polygon) {
        if(!hit_polygon.subComponents) return; //到达最后一层（个人项目层）
        var coordinates = hit_polygon.innerPolygons;  // ? hit_polygon.innerPolygons : hit_polygon.geometry;
        var subComponents=hit_polygon.subComponents;  //?hit_polygon.subComponents:hit_polygon.properties;
        var data=[];
        var property_values=[]; //该数组中的值为字符串，而不是数字

        if (coordinates) {
            for(var i=0;i<subComponents.length;i++){
                property_values.push(subComponents[i].properties);

                 data.push( {
                     "geometry": {
                         "type": "Polygon",
                         "coordinates": [coordinates[i]]
                     },
                     "subComponent":subComponents[i],
                     "type": "Feature"
                 })
            }

            var maxValue=d3.max(property_values,function (d) { return parseFloat(d[selectedProperty]); }),//此处不能用d.selectedProperty，因为此处使用变量访问属性。
                minValue=d3.min(property_values,function (d) { return parseFloat(d[selectedProperty]); });


            //重新定义投影,进一步决定path
            // var valid_projection = d3.geo.mercator()//定义投影
            //     .scale(140000)//设置缩放量
            //    .translate([width / 2, height / 2]);　//设置平移量
            // valid_projection.center(hit_polygon.project_center);

            var path = d3.geo.path()  //create a path generator
                .projection(hit_polygon.projection);　//应用上面生成的投影，每一个坐标都会先调用此投影函数，然后才产生路径值

            g.selectAll("path") //
                .data(data)
                .enter()
                .append("path")
                .attr("d", path)
                .style("stroke","#fff")
                .style("fill",function (d) {
                  return  setColor(minValue,maxValue,selectedProperty,d);
                })
                .append("title")
                .text(function(d){return d.subComponent.properties.name});
        }
}

//根据重组织后的数据(主要包括属性与坐标数据)
function drawPath(/*coordinates,properties,path,group*/) {
    var data=[];
    if(arguments.length>3){  //coordinates,properties,path,group
        for(var i=0;i<arguments[0].length;i++){
            data.push( {
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [arguments[0][i]]
                },
                "properties":arguments[1][i],
                "type": "Feature"
            })
        }

        arguments[3].selectAll("path") //
            .data(data)
            .enter()
            .append("path")
            .attr("d", arguments[2])
            .style("stroke","#fff")
            .style("fill",function (d,i) {
                return  d3.scale.category20();
            })
            .append("title")
            .text(function(d){return d.subComponent.properties.name});
    }

}

//点击放大时，获得当前点击的多边形数据（重组织后的）
function getHitPolygon(current_this) {
        var depth = current_this.__data__.properties.depth;
        var current_hierarchy;
        var name = current_this.__data__.properties.name;
        switch (depth) {
            case "1":
                current_hierarchy = hierarchy[0];
                break;
            case "2":
                current_hierarchy = hierarchy[1];
                break;
            case "3":
                current_hierarchy = hierarchy[2];
                break;
            case "4":
                current_hierarchy = hierarchy[3];
                break;
            case "5":
                current_hierarchy = hierarchy[4];
                break;
        }

        for (var i = 0; i < current_hierarchy.length; i++) {
            if (name === current_hierarchy[i].properties.name) {
                hierarchy.inUse=current_hierarchy[i];
                return current_hierarchy[i];
            }
        }
    }

// 按项目的申请机构进行聚类(参数含义：projection代表投影，programs代表项目，group代表图层)
function clusterByOrganization(projection,programs,group) {
        var clusters=[];//记录聚类后的项目(二维数组)
        clusters.itemCount=0;
        clusters.addedeCount=0;//记录每次循环增加的数目,即上一步clustered.length
        var eachCluster=[];// 每次循环属于同一组的项目数目

        var centers=[];//各个正六边形中心
        var tempPrograms=[];
        for(var j=0,l=programs.length;j<l;j++){
            centers.push(projection([programs[j].center.x,programs[j].center.y]));
            tempPrograms.push(programs[j]);
        }



        while (tempPrograms.length>0){
            for(var m=0;m<clusters.addedeCount-1;m++){
                tempPrograms.shift();
            }

            var clustered=[];//记录每次循环聚类的个数(>=1)
            var item=tempPrograms.shift();

            for(var k=0,len=tempPrograms.length;k<len;k++){
                if(tempPrograms[k].properties.dxpjzzje===item.properties.dxpjzzje){
                    var temp=tempPrograms[k];
                    tempPrograms[k]=tempPrograms[clustered.length];
                    tempPrograms[clustered.length]=temp;

                    clustered.push(temp);
                    clusters.itemCount++;
                }
            }
            clustered.push(item);
            clusters.itemCount++;
            clusters.addedeCount=clustered.length;
            clusters.push(clustered);

            eachCluster.push(clustered.length);
        }

        var clusterData=[];//项目数大于1的集群所在数组
        var singleData=[]; //单个的项目所在的数组
        for(var a=0;a<clusters.length;a++){
            for(var b=0;b<clusters[a].length;b++){
                if(clusters[a].length>1){
                    var min=d3.min(eachCluster,function (d) {return d;});
                    var max=d3.max(eachCluster,function (d) {return d;});
                    var color=setColor(min,max,eachCluster[a]);

                    clusterData.push( {
                        "fillColor":color,
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [clusters[a][b].geometry]
                        },
                        "properties":clusters[a][b].properties,
                        "type": "Feature"
                    });
                }
                else{
                    singleData.push( {
                        "fillColor":"#eee",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [clusters[a][b].geometry]
                        },
                        "properties":clusters[a][b].properties,
                        "type": "Feature"
                    });
                }
            }
        }

        var allData=clusterData.concat(singleData);

        var hexes=group.selectAll("path.subunit");
        var update=hexes.data(allData);//clusterData
        var exit=update.exit();

        update
            .style("stroke","#fff")
            .style("fill",function (d) {
                return d.fillColor;
            })
            .select("title")
            .text(function(d){return d.properties.dxpjzzje});

        exit.remove();

        //线生成器
        // var lineFunction = d3.svg.line()
        //     .x(function(d) { return d[0]; })
        //     .y(function(d) { return d[1]; })
        //     .interpolate("linear");
        //
        // var lineGraph = g5.append("path")
        //     .attr("d", lineFunction(centers))
        //     .attr("stroke", "blue")
        //     .attr("stroke-width", 0.2)
        //     .attr("fill", "none");

}


//根据用户选择的相关指标，线性插值设色
function setColor(min,max,selectedProperty,d) {
    var lightColor,deepColor;
    var linear;
    var interpolateColor;
    var color;

    if(arguments.length>3){
         linear=d3.scale.linear()  //线性比例尺
            .domain([min,max])
            .range([0,1]);
        //根据select中的值确定相应的分层设色的颜色
        switch(selectedProperty)
        {
            case "slsqxs":
                lightColor=d3.rgb(250,210,210);
                deepColor=d3.rgb(255,0,0);
                break;
            case "slsqje":
                lightColor=d3.rgb(199,21,133);
                deepColor=d3.rgb(221,180,221);
                break;
            case "pzzzxs":
                lightColor=d3.rgb(232,232,232);
                deepColor=d3.rgb(46,46,46);
                break;
            case "pzzzje":
                lightColor=d3.rgb(255,193,193);
                deepColor=d3.rgb(139,60,60);
                break;
            default:
                lightColor=d3.rgb(210,210,210);
                deepColor=d3.rgb(0,0,0);
        }

        interpolateColor=d3.interpolate(lightColor,deepColor);

        color=interpolateColor(linear(parseFloat(d.subComponent.properties[selectedProperty])));
        return color;
    }

    else{  // 实参为一个min,max,array[i]时
        linear=d3.scale.linear()  //线性比例尺
            .domain([arguments[0],arguments[1]])
            .range([0,1]);

        lightColor=d3.rgb(193,255,193);//250,240,240
        deepColor=d3.rgb(0,139,69);//255,0,0
        interpolateColor=d3.interpolate(lightColor,deepColor);
        return interpolateColor(linear(arguments[2]));
    }

}


