//本文件主要包含数学与几何计算处理


//获取坐标最值,参数features为geoJson的要素集,返回的是经纬度范围
function getRange(features) {
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
var reorganize=function (d) {
    var depth=parseInt(d.properties.depth);
    switch(depth)
    {
        case 2://学部  (地球科学部)
            departments.push({"fillColor":d.fillColor,
                "properties":d.properties,
                "subComponent":[]
            });
            break;
        case 3://学科  （地理学）
            var subject=({"fillColor":d.fillColor,
                "properties":d.properties,
                "subComponent":[]
            });
            subjects.push(subject);
            addSubComponent(d,departments,subject);
            break;
        case 4://子学科  （地理信息系统）
            var sub_discipline=({"fillColor": d.fillColor? d.fillColor : "#ccc",
                "properties":d.properties,
                "subComponent":[]
            });
            sub_disciplines.push(sub_discipline);
            addSubComponent(d,subjects,sub_discipline);
            break;
        case 5://项目  （基于深度学习的城市情感空间构建研究）
            var program=({"fillColor":  d.fillColor? d.fillColor : "#ccc",
                "properties":d.properties,
                "geometry":d.geometry.coordinates    // Array(7)
            });
            programs.push(program);
            addSubComponent(d,sub_disciplines,program);
            break;
    }
}

//读到某一图层的数据时，为其上一图层的subComponent添加数据
function addSubComponent(data,upper_layer,newItem) {
    for(var i=0; i<upper_layer.length; i++){
        if(data.properties.parentname==upper_layer[i].properties.name){
            upper_layer[i].subComponent.push(newItem);
            break;
        }
    }
}



//数据处理后再显示
function processedShow(groups) {
    if(window.data_over===true){
        var data=[departments,subjects,sub_disciplines,programs];
        var current_data;
        for(var i=1;i<groups.length;i++){
            if(groups[i].style("display")==="inline"){
                current_data=data[i-1];
            }
        }
        data=null;
        var descendings=d3.entries(current_data)
            .sort(function (a,b) {
                if(a.value.properties.pzzzxs && b.value.properties.pzzzxs)
                    return d3.descending( parseInt(a.value.properties.pzzzxs),parseInt(b.value.properties.pzzzxs));
            });

        var min_sorted_array=[];
        for(var i=0;i<descendings.length;i++){
            min_sorted_array.push(descendings[i].value.properties.pzzzxs);
        }
        return min_sorted_array;
    }
}

//判断当前显示的是哪一个图层
function whichLayer(group) {
    var layer_num=0;
    for(var i=0;i<group.length;i++){
        if(group[i].style("display")==="inline"){
            layer_num=i;
            break;
        }
    }
    return layer_num;
}

