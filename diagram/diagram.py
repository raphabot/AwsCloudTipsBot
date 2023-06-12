# diagram.py
from diagrams import Cluster, Diagram
from diagrams.aws.compute import LambdaFunction
from diagrams.aws.integration import Eventbridge
from diagrams.aws.storage import SimpleStorageServiceS3BucketWithObjects, SimpleStorageServiceS3Object
from diagrams.saas.social import Twitter
from diagrams.custom import Custom

with Diagram("Daily AWS Tips", filename="diagram", outformat=["svg", "png"], show=False):
    bucketEvent = SimpleStorageServiceS3BucketWithObjects("TipsBucket")

    Eventbridge("Once, every day at 10AM CST") >> LambdaFunction("PickTipsLambda") >> SimpleStorageServiceS3Object("tip-of-the-day.json") >> bucketEvent

    with Cluster("Twitter"):
        bucketEvent >> LambdaFunction("TweetTipLambda") >> Twitter("@DailyAwsTips")

    with Cluster("Mastodon"):
        bucketEvent >> LambdaFunction("Mastodon") >> Custom("@DailyAwsTips@mastodon.online", "./mastodon-icon.png")