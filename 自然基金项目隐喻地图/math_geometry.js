//本文件主要包含：（1）对数据的前期数学、几何计算处理以及重新组织；（2）点击某一区域后放大显示其细节的多个功能函数

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
function getRangeByCoordinates(coordinates) {
    var pts=[];//
    for(var j=0;j<coordinates.length;j++)
    {
        for(var k=0;k<coordinates[j].length;k++)
        {
            var pt=[coordinates[j][k][0] ,coordinates[j][k][1]];
            pts.push(pt);
        }
    }
    var range={min_log:0, min_lat:0, max_log:100,max_lat:100};// log 经度  lat:纬度
    range.min_log=d3.min(pts,function (d) { return d[0];});
    range.min_lat=d3.min(pts,function (d) { return d[1];});
    range.max_log=d3.max(pts,function (d) { return d[0];});
    range.max_lat=d3.max(pts,function (d) { return d[1];});
    return range;
}


//获取不规则多边形重心,参数为多边形顶点集合
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
var reorganize=function (d,center) {
    var depth=parseInt(d.properties.depth);
    switch(depth)
    {
        case 1: //第一图层
            whole.push({  "fillColor":d.fillColor,
                "project_center":center,
                "properties":d.properties,
                "innerPolygons":[],   //记录其内部下一级各个多边形的坐标
                "subComponents":[]    //记录其内部组成（逐层嵌套）
            });
            break;
        case 2://学部  (地球科学部)
            var department={ "fillColor":d.fillColor,
                "project_center":center,
                "properties":d.properties,
                "innerPolygons":[],
                "subComponents":[]
            }
            departments.push(department);
            addSub_Inner(d,whole,department);
            break;
        case 3://学科  （地理学）
            var subject=({"fillColor":d.fillColor,
                "project_center":center,
                "properties":d.properties,
                "innerPolygons":[],
                "subComponents":[]
            });
            subjects.push(subject);
            addSub_Inner(d,departments,subject);
            break;
        case 4://子学科  （地理信息系统）
            var sub_discipline=({"fillColor": d.fillColor? d.fillColor : "#ccc",
                "project_center":center,
                "properties":d.properties,
                "innerPolygons":[],
                "subComponents":[]
            });
            sub_disciplines.push(sub_discipline);
            addSub_Inner(d,subjects,sub_discipline);
            break;
        case 5://项目  （基于深度学习的城市情感空间构建研究）
            var program=({"fillColor":  d.fillColor? d.fillColor : "#ccc",
                "project_center":center,
                "properties":d.properties,
                "geometry":d.geometry.coordinates    // Array(7)
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
function displayDetail(selectedProperty,width,height,g,hit_polygon) {
        var coordinates = hit_polygon.innerPolygons ? hit_polygon.innerPolygons : hit_polygon.geometry;
        var subComponents=hit_polygon.subComponents?hit_polygon.subComponents:hit_polygon.properties;
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

            var maxValue=d3.max(property_values,function (d) { return parseFloat(d[selectedProperty]); }),//此处不能用d.selectedProperty，否则相当于d中直接有属性"selectedProperty".
                minValue=d3.min(property_values,function (d) { return parseFloat(d[selectedProperty]); });


            //重新定义投影,进一步决定path
            var valid_projection = d3.geo.mercator()//定义投影
                .scale(140000)//设置缩放量
               .translate([width / 2, height / 2]);　//设置平移量
            valid_projection.center(hit_polygon.project_center);

            var path = d3.geo.path()  //create a path generator
                .projection(valid_projection);　//应用上面生成的投影，每一个坐标都会先调用此投影函数，然后才产生路径值

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


//根据用户选择的相关指标，线性插值设色
function setColor(min,max,selectedProperty,d) {
    var linear=d3.scale.linear()  //线性比例尺
        .domain([min,max])
        .range([0,1]);

    var a=d3.rgb(250,200,200),
        b=d3.rgb(255,0,0);

    var interpolateColor=d3.interpolate(a,b);

    var color=interpolateColor(linear(parseFloat(d.subComponent.properties[selectedProperty])));
    return color;


}


