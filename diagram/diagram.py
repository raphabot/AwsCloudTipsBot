# diagram.py
from diagrams import Diagram
from diagrams.aws.compute import LambdaFunction
from diagrams.aws.integration import Eventbridge
from diagrams.aws.storage import SimpleStorageServiceS3BucketWithObjects, SimpleStorageServiceS3Object
from diagrams.saas.social import Twitter

with Diagram("Daily AWS Tips", filename="diagram", outformat=["svg", "png"], show=False):
    Eventbridge("Once, every day at 10AM CST") >> LambdaFunction("PickTipsLambda") >> SimpleStorageServiceS3Object("tip-of-the-day.json") >> SimpleStorageServiceS3BucketWithObjects("TipsBucket") >> LambdaFunction("TweetTipLambda") >> Twitter("@DailyAwsTips")